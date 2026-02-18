import type { SearchNode } from "../supa-sync.types";
import type { SearchCondition } from "./idb-filter-builder";
import { IDBStoreAdapter } from "./idb-store-adapter";

type FreeIndexItem = { idx: -1, indexes: number[] };

const FREE_INDEX = -1;
const ROOT_INDEX = 0;

function getWords(text: string) {
    if (!text) return [];
    const words = text.split(/\.*[\s\n\t|,;:\/()]+/);
    return words.filter(Boolean);
}

function isEmpty(obj: Record<any, any>): boolean {
    for (const _ in obj) return false;
    return true;
}

export class IDBSearchIndex {

    private nodes: SearchNode[] = [];
    private freeIndexes: number[] = [];
    private nodeIndexesByChar: Record<string, number[]> = {};
    
    private _initialized: () => void = () => {};
    private readonly initialized = new Promise<void>(resolve => this._initialized = resolve);

    constructor(
        private readonly store: IDBStoreAdapter<SearchNode>,
    ) {
        this.load().then(() => this._initialized());
    }
    
    async update(updates: { old: string | undefined, new: string | undefined, key: number }[]) {
        await this.initialized;
        const changedIndexes = new Set<number>(), removedIndexes = new Set<number>();
        for (const { old: oldText, new: newText, key } of updates) {
            const oldWords = oldText ? getWords(oldText) : [];
            const newWords = newText ? getWords(newText) : [];
            const oldWordSet = new Set(oldWords);
            const newWordSet = new Set(newWords);
            const addedWords = newWordSet.difference(oldWordSet);
            const removedWords = oldWordSet.difference(newWordSet);
            if (addedWords.size)
                this._insert([...addedWords], key, changedIndexes);
            if (removedWords.size)
                this._remove([...removedWords], key, changedIndexes, removedIndexes);
        }
        await this.saveNodes(changedIndexes, removedIndexes);
    }

    async clear() {
        this.nodes = [{ idx: ROOT_INDEX, children: {} }];
        this.freeIndexes = [];
        this.nodeIndexesByChar = {};
        await this.store.clear();
    }

    async queryCondition(condition: SearchCondition): Promise<Set<number>> {
        await this.initialized;
        let value = condition.value;
        if (!value) return new Set<number>();
        const words = getWords(value);
        switch (condition.operator) {
            case "containsText": {
                let result = new Set<number>();
                for (const word of words) {
                    const startIndexes = this.nodeIndexesByChar[word[0]];
                    if (!startIndexes) return result;
                    const remainingWord = word.slice(1);
                    for (let currIndex of startIndexes) {
                        const res = this.continuesWith(currIndex, remainingWord);
                        if (res) result = result.union(res);
                    }
                }
                return result;
            }
            case "startsWith": {
                let result = new Set<number>();
                for (const word of words) {
                    const res = this.continuesWith(ROOT_INDEX, word);
                    if (res) result = result.union(res);
                }
                return result;
            }
            case "closest": {
                const result = new Set<number>();
                const limit = condition.limit;
                for (const word of words)
                    if (result.size < limit)
                        this.getLongestCommonPrefix(word, limit, result);
                return result;
            }
        }
    }

    private async load() {
        const nodes = await this.store.readAll();
        let largestIndex = -1;
        for (const node of nodes) {
            if (node.idx === FREE_INDEX) {
                this.freeIndexes = (node as unknown as FreeIndexItem).indexes;
                continue;
            }
            if (node.idx > largestIndex)
                largestIndex = node.idx;
        }
        this.nodes = new Array(Math.max(largestIndex, ROOT_INDEX) + 1);
        for (const node of nodes) {
            if (node.idx === FREE_INDEX) continue;
            this.nodes[node.idx] = node;
            for (const char in node.children) {
                if (char in this.nodeIndexesByChar)
                    this.nodeIndexesByChar[char].push(node.children[char]);
                else
                    this.nodeIndexesByChar[char] = [node.children[char]];
            }
        }
        this.nodes[ROOT_INDEX] ??= { idx: ROOT_INDEX, children: {} };
    }

    private _insert(words: string[], key: number, changedIndexes: Set<number>) {
        for (const word of words) {
            let currIndex = ROOT_INDEX;
            for (const char of word) {
                const children = this.nodes[currIndex].children;
                if (char in children)
                    currIndex = children[char];
                else {
                    changedIndexes.add(currIndex);
                    currIndex = children[char] = this.createNewNode(char, changedIndexes);
                }
            }
            const node = this.nodes[currIndex];
            node.keys = (node.keys ?? new Set()).add(key);
            changedIndexes.add(currIndex);
        }
    }

    private _remove(words: string[], key: number, changedIndexes: Set<number>, removedIndexes: Set<number>) {
        outer:
        for (const word of words) {
            let currIndex = ROOT_INDEX;
            const path: number[] = new Array(word.length);
            for (let i = 0; i < word.length; i++) {
                path[i] = currIndex;
                const children = this.nodes[currIndex].children;
                currIndex = children[word[i]];
                if (currIndex == null)
                    continue outer;
            }
            const node = this.nodes[currIndex];
            if (node?.keys) {
                node.keys.delete(key);
                changedIndexes.add(currIndex);
                if (!node.keys.size) {
                    delete node.keys;
                    path.push(currIndex);
                    this.removePath(word, path, changedIndexes, removedIndexes);
                }
            }
        }
    }

    private async saveNodes(changedIndexes: Set<number>, removedIndexes?: Set<number>) {
        if (removedIndexes?.size)
            changedIndexes = changedIndexes.difference(removedIndexes);
        const changedNodes = [...changedIndexes].map(idx => idx === FREE_INDEX
            ? { idx: FREE_INDEX, indexes: this.freeIndexes }
            : this.nodes[idx]) as SearchNode[];
        await this.store.writeMany(changedNodes, removedIndexes ? [...removedIndexes] : undefined);
    }

    private createNewNode(char: string, changedIndexes: Set<number>) {
        let index: number;
        if (this.freeIndexes.length) {
            index = this.freeIndexes.pop()!;
            this.nodes[index] = { idx: index, children: {} };
        } else {
            index = this.nodes.length;
            this.nodes.push({ idx: index, children: {} });
        }
        if (char in this.nodeIndexesByChar)
            this.nodeIndexesByChar[char].push(index);
        else
            this.nodeIndexesByChar[char] = [index];
        changedIndexes.add(index);
        return index;
    }

    private removePath(string: string, path: number[], changedIndexes: Set<number>, removedIndexes: Set<number>) {
        for (let i = path.length - 1; i >= 0; i--) {
            const nodeIndex = path[i];
            const node = this.nodes[nodeIndex];
            const childChar = string[i];
            if (childChar) {
                const childIndex = node.children[childChar];
                delete node.children[childChar];
                this.nodeIndexesByChar[childChar] = this.nodeIndexesByChar[childChar].filter(i => i !== childIndex);
                changedIndexes.add(nodeIndex);
            }
            if (node.keys || !isEmpty(node.children))
                return;
            if (nodeIndex === this.nodes.length - 1)
                this.nodes.pop();
            else {
                this.freeIndexes.push(nodeIndex);
                changedIndexes.add(FREE_INDEX);
            }
            removedIndexes.add(nodeIndex);
        }
    }

    private getLongestCommonPrefix(word: string, limit: number, result: Set<number>) {
        const nodesByLength: Record<number, SearchNode[]> = {};
        for (let w = 0; w < word.length; w++) {
            const startIndexes = this.nodeIndexesByChar[word[w]];
            if (!startIndexes) continue;
            for (const currIndex of startIndexes) {
                let node = this.nodes[currIndex];
                const nodes = [node];
                let i = w + 1;
                for (; i < word.length; i++) {
                    const char = word[i];
                    if (!(char in node.children))
                        break;
                    node = this.nodes[node.children[char]];
                    nodes.push(node);
                }
                const length = i - w;
                if (nodesByLength[length])
                    nodesByLength[length].push(...nodes);
                else
                    nodesByLength[length] = nodes;
            }
        }
        const lengths = Object.keys(nodesByLength).map(i => +i).sort((a, b) => b - a);
        for (const length of lengths) {
            const nodes = nodesByLength[length];
            for (const node of nodes) {
                const subKeys = this.getAllSubKeys(node);
                for (const key of subKeys) {
                    if (!result.has(key)) {
                        result.add(key);
                        if (limit === result.size)
                            return;
                    }
                }
            }
        }
    }

    private continuesWith(startIndex: number, value: string) {
        let node = this.nodes[startIndex];
        for (const char of value) {
            if (!(char in node.children))
                return null;
            node = this.nodes[node.children[char]];
        }
        return this.getAllSubKeys(node);
    }

    private getAllSubKeys(node: SearchNode): Set<number> {
        let res = new Set<number>();
        const stack: SearchNode[] = [node];
        while (stack.length) {
            const node = stack.pop()!;
            if (node.keys)
                res = res.union(node.keys);
            if (node.children)
                for (const char in node.children)
                    stack.push(this.nodes[node.children[char]]);
        }
        return res;
    }
}