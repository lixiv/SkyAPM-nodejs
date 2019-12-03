'use strict'

const asyncHooks = require('async_hooks');

module.exports = function (ins) {
    const asyncHook = asyncHooks.createHook({
        init: (asyncId, type, triggerAsyncId) => {
            if (type === 'TIMERWRAP') {
                return;
            }
            //   const traceContext = ins.activeTraceContext;
            //   if (traceContext) {
            //     traceContexts.set(asyncId, traceContext);
            //   }
            const triggerTraceContext = traceContexts.get(triggerAsyncId);
            if (triggerTraceContext) {
                traceContexts.set(asyncId, triggerTraceContext);
            }
        },
        destroy: (asyncId) => {
            traceContexts.delete(asyncId);
        }
    });

    const traceContexts = new Map();
    Object.defineProperty(ins, 'activeTraceContext', {
        get() {
            const asyncId = asyncHooks.executionAsyncId();
            return traceContexts.get(asyncId) || null;
        },
        set(traceContext) {
            const asyncId = asyncHooks.executionAsyncId();
            if (traceContext) {
                traceContexts.set(asyncId, traceContext);
            } else {
                traceContexts.delete(asyncId);
            }
        }
    });

    asyncHook.enable();
}