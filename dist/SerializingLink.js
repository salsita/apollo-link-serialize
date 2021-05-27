import { ApolloLink, Observable, } from '@apollo/client/core';
import { extractKey } from './extractKey';
export default class SerializingLink extends ApolloLink {
    constructor() {
        super(...arguments);
        this.opQueues = {};
        this.enqueue = (key, entry) => {
            if (!this.opQueues[key]) {
                this.opQueues[key] = [];
            }
            this.opQueues[key].push(entry);
            if (this.opQueues[key].length === 1) {
                this.startFirstOpIfNotStarted(key);
            }
        };
        this.cancelOp = (key, entryToRemove) => {
            if (!this.opQueues[key]) {
                return;
            }
            const idx = this.opQueues[key].findIndex(entry => entryToRemove === entry);
            if (idx >= 0) {
                const entry = this.opQueues[key][idx];
                if (entry.subscription) {
                    entry.subscription.unsubscribe();
                }
                this.opQueues[key].splice(idx, 1);
            }
            this.startFirstOpIfNotStarted(key);
        };
        this.startFirstOpIfNotStarted = (key) => {
            if (this.opQueues[key].length === 0) {
                delete this.opQueues[key];
                return;
            }
            const { operation, forward, observer, subscription } = this.opQueues[key][0];
            if (subscription) {
                return;
            }
            this.opQueues[key][0].subscription = forward(operation).subscribe({
                next: (v) => observer.next && observer.next(v),
                error: (e) => {
                    if (observer.error) {
                        observer.error(e);
                    }
                },
                complete: () => {
                    if (observer.complete) {
                        observer.complete();
                    }
                },
            });
        };
    }
    request(origOperation, forward) {
        const { operation, key } = extractKey(origOperation);
        if (!key) {
            return forward(operation);
        }
        return new Observable((observer) => {
            const entry = { operation, forward, observer };
            this.enqueue(key, entry);
            return () => {
                this.cancelOp(key, entry);
            };
        });
    }
}
//# sourceMappingURL=SerializingLink.js.map