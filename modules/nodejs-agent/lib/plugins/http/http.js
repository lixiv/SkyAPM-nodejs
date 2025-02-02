/*
 * Licensed to the SkyAPM under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

const onFinished = require("on-finished");
const ContextCarrier = require("../../trace/context-carrier");
const layerDefine = require("../../trace/span-layer");
const componentDefine = require("../../trace/component-define");
const agentConfig = require("../../config");
const suffixPattern = agentConfig.getIgnoreSuffixRegex();

/**
 *
 * @param {httpModule} httpModule
 * @param {instrumentation} instrumentation
 * @param {contextManager} contextManager
 * @return {*}
 * @author zhang xin
 */
module.exports = function(httpModule, instrumentation, contextManager) {
    instrumentation.enhanceMethod(httpModule && httpModule.Server && httpModule.Server.prototype, "emit", wrapEmit);

    instrumentation.enhanceMethod(httpModule, "request", wrapRequest);

    return httpModule;

    /**
     * filterParams
     * @param {endpointName} endpointName
     * @return {*}
     */
    function filterParams(endpointName) {
        if (endpointName && endpointName.indexOf("?") > -1) {
            // filter params
            return endpointName.split("?")[0];
        }
        return endpointName;
    }

    function shouldIgnore(endpointName) {
        //var suffixPattern = /\.jpg$|\.jpeg$|\.js$|\.css$|\.png$|\.bmp$|\.gif$|\.ico$|\.mp3$|\.mp4$|\.html$|\.svg$/;
        if (suffixPattern && endpointName && suffixPattern.test(filterParams(endpointName))) {
            return true;
        }
        return false;
    }

    /**
     *
     * @param {original} original
     * @return {function(*, *, *=): *}
     */
    function wrapEmit(original) {
        return function(event, req, res) {
            if (event === "request" && !shouldIgnore(req.url)) {
                let contextCarrier = new ContextCarrier();
                contextCarrier.fetchBy(function(key) {
                    if (req.headers.hasOwnProperty(key)) {
                        return req.headers[key];
                    }
                    return undefined;
                });

                //sample control
                if (contextCarrier.getSample() !== '1' && agentConfig.isSampleLimit()) {
                    instrumentation.activeTraceContext = null;
                    return original.apply(this, arguments);
                }

                let span = contextManager.createEntrySpan(filterParams(req.url), contextCarrier);
                instrumentation.activeTraceContext = span.traceContext();
                span.component(componentDefine.Components.HTTP);
                span.spanLayer(layerDefine.Layers.HTTP);
                onFinished(res, function(err) {
                    if (err) {
                        span.errorOccurred();
                        span.log(err);
                    }

                    if (this.statusCode > 400) {
                        span.errorOccurred();
                    }

                    contextManager.finishSpan(span);
                });
            }
            return original.apply(this, arguments);
        };
    }

    /**
     *
     * @param {original} original
     * @return {function(*, *): *}
     */
    function wrapRequest(original) {
        return function(options, callback) {
            if (!instrumentation.activeTraceContext) {
                return original.apply(this, arguments);
            }

            let contextCarrier = new ContextCarrier();
            //let span = contextManager.createExitSpan(options.path, options.host + ":" + options.port, contextCarrier);
            let span = contextManager.createExitSpan(filterParams(options.path), options.host + ":" + options.port, contextCarrier, instrumentation.activeTraceContext);
            contextCarrier.pushBy(function(key, value) {
                if (!options.hasOwnProperty("headers")) {
                    options.headers = {};
                }
                options.headers[key] = value;
            });
            span.component(componentDefine.Components.HTTP);
            span.spanLayer(layerDefine.Layers.HTTP);
            let result = original.apply(this, arguments);
            contextManager.finishSpan(span);
            return result;
        };
    }
};
