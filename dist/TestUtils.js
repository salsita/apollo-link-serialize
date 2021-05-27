import { ApolloLink, Observable, } from '@apollo/client/core';
export class TestLink extends ApolloLink {
    constructor() {
        super();
        this.operations = [];
    }
    request(operation) {
        this.operations.push(operation);
        return new Observable(observer => {
            if (operation.getContext().testError) {
                setTimeout(() => observer.error(operation.getContext().testError), 0);
                return;
            }
            setTimeout(() => observer.next(operation.getContext().testResponse), 0);
            setTimeout(() => observer.complete(), 0);
        });
    }
}
export class TestSequenceLink extends ApolloLink {
    constructor() {
        super();
        this.operations = [];
    }
    request(operation, forward) {
        if (!operation.getContext().testSequence) {
            return forward(operation);
        }
        this.operations.push(operation);
        return new Observable(observer => {
            operation.getContext().testSequence.forEach((event) => {
                if (event.type === 'error') {
                    setTimeout(() => observer.error(event.value), event.delay || 0);
                    return;
                }
                if (event.type === 'next') {
                    setTimeout(() => observer.next(event.value), event.delay || 0);
                }
                if (event.type === 'complete') {
                    setTimeout(() => observer.complete(), event.delay || 0);
                }
            });
        });
    }
}
export function mergeObservables(...observables) {
    return new Observable(observer => {
        const numObservables = observables.length;
        let completedObservables = 0;
        observables.forEach(o => {
            o.subscribe({
                next: observer.next.bind(observer),
                error: observer.error.bind(observer),
                complete: () => {
                    completedObservables++;
                    if (completedObservables === numObservables) {
                        observer.complete();
                    }
                },
            });
        });
    });
}
export function toResultValue(e) {
    const obj = Object.assign({}, e);
    delete obj.delay;
    return obj;
}
export const assertObservableSequence = (observable, sequence, initializer = () => undefined) => {
    let index = 0;
    if (sequence.length === 0) {
        throw new Error('Observable sequence must have at least one element');
    }
    return new Promise((resolve, reject) => {
        const sub = observable.subscribe({
            next: (value) => {
                expect({ type: 'next', value }).toEqual(sequence[index]);
                index++;
                if (index === sequence.length) {
                    resolve(true);
                }
            },
            error: (value) => {
                expect({ type: 'error', value }).toEqual(sequence[index]);
                index++;
                expect(undefined).toEqual(sequence[index]);
                resolve(true);
            },
            complete: () => {
                expect({ type: 'complete' }).toEqual(sequence[index]);
                index++;
                expect(undefined).toEqual(sequence[index]);
                resolve(true);
            },
        });
        initializer(sub);
    });
};
//# sourceMappingURL=TestUtils.js.map