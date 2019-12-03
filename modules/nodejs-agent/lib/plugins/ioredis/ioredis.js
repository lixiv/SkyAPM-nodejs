"use strict";

const spanLayer = require("../../trace/span-layer");
const componentDefine = require("../../trace/component-define");
const Tags = require("../../trace/tags");

module.exports = function(originModule, instrumentation, contextManager) {
    //instrumentation.enhanceMethod(originModule, "connect", wrapInitPromise);
    //instrumentation.enhanceMethod(originModule.Command && originModule.Command.prototype, 'initPromise', wrapInitPromise);
    instrumentation.enhanceMethod(originModule.prototype, 'sendCommand', wrapSendCommand);

    function wrapSendCommand(original) {
        return function wrappedSendCommand (command_obj) {
            if (!instrumentation.activeTraceContext || !command_obj) {
                return original.apply(this, arguments);
            }
            //console.log('intercepted call to ioredis.prototype.sendCommand %o', {command: command_obj })
            
            let span = contextManager.createExitSpan("Redis/" + command_obj.name, this.options.host + ":" + this.options.port, undefined, instrumentation.activeTraceContext);
            span.component(componentDefine.Components.REDIS);
            span.spanLayer(spanLayer.Layers.CACHE);
            Tags.DB_TYPE.tag(span, "Redis");
            Tags.DB_STATEMENT.tag(span, command_obj.name + " args: " + command_obj.args.toString());

            let resolve = command_obj.resolve;
            let reject = command_obj.reject;
            if (typeof command_obj.resolve === 'function') {
                command_obj.resolve = instrumentation.enhanceCallback(span.traceContext(), contextManager, function() {
                    return resolve.apply(this, arguments);
                });
            }
            if (typeof command_obj.reject === 'function') {
                command_obj.reject = instrumentation.enhanceCallback(span.traceContext(), contextManager, function() {
                    return reject.apply(this, arguments);
                });
            }
            if (command_obj.promise) {
                const endSpan = function () {
                    contextManager.finishSpan(span);
                }
                if (typeof command_obj.promise.then === 'function') {
                    command_obj.promise.then(endSpan).catch(endSpan)
                }
            }

            return original.apply(this, arguments);
        }
    }

    return originModule;
};