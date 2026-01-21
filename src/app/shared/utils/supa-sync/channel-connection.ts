import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { AsyncState } from "../async-state";
import { wait } from "../flow-control-utils";

const RECONNECT_DELAY_MS = 2000;

export class ChannelConnection {

    private _channel: RealtimeChannel | undefined;
    private closing = false;
    public get channel() { return this._channel; }

    constructor(
        private readonly constructChannel: () => RealtimeChannel,
        private readonly onlineState: AsyncState<boolean>,
    ) {
        this.assureConnection();
    }

    close<D>(client: SupabaseClient<D>) {
        this.closing = true;
        const channel = this._channel;
        if (!channel) return;
        channel.unsubscribe();
        client.removeChannel(channel);
    }

    private async assureConnection() {
        let firstFail = false;
        while (true) {
            await new Promise<void>(resolve => {
                this._channel?.unsubscribe();
                this._channel = this.constructChannel()
                    .subscribe(state => {
                        switch (state) {
                            case 'SUBSCRIBED':
                                if (firstFail) console.log('... reconnected to realtime channel.');
                                firstFail = false;
                                break;
                            case 'CHANNEL_ERROR':
                                console.warn('Failed to subscribe to realtime channel, retrying...');
                                resolve();
                                break;
                            case 'TIMED_OUT':
                                console.warn('Realtime subscription timed out, retrying...');
                                resolve();
                                break;
                            case 'CLOSED':
                                resolve();
                                break;
                        }
                    });
            });
            if (this.closing) return;
            await wait(RECONNECT_DELAY_MS);
            await this.onlineState.get();
            firstFail = true;
        }
    }
}