// IndexedDB globals for tests. SupaSync's store adapter patches `IDBRequest.prototype` at module
// load, so any spec that reaches the data layer needs these before its imports evaluate.
import 'fake-indexeddb/auto';
