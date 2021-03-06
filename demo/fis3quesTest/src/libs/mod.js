/**
 * file: mod.js
 * ver: 1.0.7
 * update: 2014/4/14
 *
 * https://github.com/zjcqoo/mod
 */
var require, define;

(function (global) {
    var head = document.getElementsByTagName('head')[0],
        loadingMap = {},
        factoryMap = {},
        modulesMap = {},
        scriptsMap = {},
        resMap = {},
        pkgMap = {},
        aliasMap = {},
        cdnPath, htdocsPath;

    function createScript(url, onerror, options) {
        if (url in scriptsMap) return;
        scriptsMap[url] = true;

        var script = document.createElement('script'),
            start = +new Date();

        script.onload = function () {
            var duration = +new Date() - start;
            if(options && options.noReport){
                return;
            }
            // setTimeout(function () {
            //     window.MMReport && MMReport.report(((options && options.reportPath)?options.reportPath:url), 0, duration);
            // }, 3000);
            (options || (options = {})) && (options.onloadReportInfo = {
                url: (options && options.reportPath)?options.reportPath:url,
                ec: 0,
                duration: duration
            });
            // if(url.search(htdocsPath) != -1 && url.search('.js')!=-1){
            //     setTimeout(function () {
            //         badjs('script load redirect success:' + url, window.location.href, 0, 526122, 2);
            //     }, 3000);
            // }
        };

        script.onerror = function () {
            var duration = +new Date() - start;
	        onerror && onerror();

            if(url.indexOf(cdnPath)!=-1){
                createScript(url.replace(cdnPath, htdocsPath), onerror, options);
            }

            if(options && options.noReport){
                return;
            }
            if(url.search(htdocsPath) == -1) {
                // setTimeout(function () {
                //     window.MMReport && MMReport.report(((options && options.reportPath) ? options.reportPath : url), 1, duration);
                //     badjs('script load error:' + url, window.location.href, 0, 507884, 4);
                // }, 3000);
                (options || (options = {})) && (options.onloadReportInfo = {
                    url: (options && options.reportPath)?options.reportPath:url,
                    ec: 1,
                    duration: duration
                });
            }else {
                // setTimeout(function () {
                //     badjs('script load redirect error:' + url, window.location.href, 0, 526123, 4);
                // }, 3000);
            }
        };

        script.type = 'text/javascript';
        script.src = url;
        head.appendChild(script);
        return script;
    }

    function loadScript(id, callback, onerror) {
        var queue = loadingMap[id] || (loadingMap[id] = []);
        queue.push(callback);

        //
        // resource map query
        //
        var res = resMap[id] || {};
        var pkg = res.pkg;
        var url;

        if (pkg) {
            url = pkgMap[pkg].url;
        } else {
            url = res.url || id;
        }

        if (aliasMap[id]) {
            url = aliasMap[id];
        }

        createScript(url, onerror && function () {
            onerror(id);
        });
    }

    define = function (id, deps, factory) {
        //console.log('define:', id);
        if (factory === undefined) {
            factory = deps;
        }
        factoryMap[id] = factory;

        var queue = loadingMap[id];
        if (queue) {
            for (var i = 0, n = queue.length; i < n; i++) {
                queue[i]();
            }
            delete loadingMap[id];
        }
    };

    require = function (id) {
        id = require.alias(id);

        var mod = modulesMap[id];
        if (mod) {
            return mod.exports;
        }

        //
        // init module
        //
        var factory = factoryMap[id];
        if (!factory) {
            throw '[ModJS] Cannot find module `' + id + '`';
        }

        mod = modulesMap[id] = {
            exports: {}
        };

        //
        // factory: function OR value
        //
        var ret = (typeof factory == 'function')
            ? factory.apply(mod, [require, mod.exports, mod])
            : factory;

        if (ret) {
            mod.exports = ret;
        }
        return mod.exports;
    };

    require.async = function (names, onload, onerror) {
        if (typeof names == 'string') {
            names = [names];
        }

        for (var i = 0, n = names.length; i < n; i++) {
            names[i] = require.alias(names[i]);
        }

        var needMap = {};
        var needNum = 0;

        function findNeed(depArr) {
            for (var i = 0, n = depArr.length; i < n; i++) {
                //
                // skip loading or loaded
                //
                var dep = depArr[i];
                if (dep in factoryMap || dep in needMap) {
                    continue;
                }

                needMap[dep] = true;
                needNum++;
                loadScript(dep, updateNeed, onerror);

                var child = resMap[dep];
                if (child && 'deps' in child) {
                    findNeed(child.deps);
                }
            }
        }

        function updateNeed() {
            if (0 == needNum--) {
                var args = [];
                for (var i = 0, n = names.length; i < n; i++) {
                    args[i] = require(names[i]);
                }

                onload && onload.apply(global, args);
            }
        }

        findNeed(names);
        updateNeed();
    };

    require.resourceMap = function (obj) {
        var k, col;

        // merge `res` & `pkg` fields
        col = obj.res;
        for (k in col) {
            if (col.hasOwnProperty(k)) {
                resMap[k] = col[k];
            }
        }

        col = obj.pkg;
        for (k in col) {
            if (col.hasOwnProperty(k)) {
                pkgMap[k] = col[k];
            }
        }
    };

    require.loadJs = function (url) {
        createScript(url);
    };

    require.loadCss = function (cfg) {
        if (cfg.content) {
            var sty = document.createElement('style');
            sty.type = 'text/css';

            if (sty.styleSheet) {       // IE
                sty.styleSheet.cssText = cfg.content;
            } else {
                sty.innerHTML = cfg.content;
            }
            head.appendChild(sty);
        }
        else if (cfg.url) {
            var link = document.createElement('link');
            link.href = cfg.url;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            head.appendChild(link);
        }
    };


    require.alias = function (id) {
        return id;
    }; // {return aliasMap[id] || id};

    require.timeout = 5000;

    require.config = function (opts) {
        cdnPath = opts.cdnPath || cdnPath;
        htdocsPath = opts.htdocsPath || htdocsPath;
        aliasMap = opts.aliasMap || aliasMap;
    };

    /*var encryptSkey= function (str) {
        if (!str) {
            return '';
        }
        var hash = 5381;
        for (var i = 0, len = str.length; i < len; ++i) {
            hash += (hash << 5) + str.charAt(i).charCodeAt();
        }
        return hash & 0x7fffffff;
    };

    var getBkn = function () {
        return encryptSkey(getCookie('skey'));
    };

    var getCookie = function(n){
        var m = document.cookie.match(new RegExp("(^| )" + n + "=([^;]*)(;|$)"));
        return !m ? "" : decodeURIComponent(m[2]);
    };*/

//    var iiii = 0;
    require.getData = function(url, cb, onerror, options){
       var cbName = 'defineData'+Math.floor(Math.random()*10000);
        // var cbName = 'defineData222';
        url += (url.indexOf('?')!=-1?'&':'?')+'callback='+cbName+'&_t='+(new Date().getTime());
        window[cbName] = function(data){
            setTimeout(function() {
                cb(data, options);
            });
        };
//        createScript(url, onerror, {reportPath: (options && options.reportPath)?options.reportPath:url});
        createScript(url, onerror, options);
    };

})(this);
