/*! Highlight JS Loader v4.0 | MIT Licensed (C) 2015 Ali.Dbg | http://goo.gl/IRlJuI */  
;(function(doc, notdefined, replace, innerHTML, appendChild, addEventListener, getElementsByTagName) {
    "use strict";
    var css = ".hljs,.hljs span{font-family:Consolas,Monaco,monospace;line-height:1.45;word-wrap:normal;position:relative;float:none;direction:ltr}.hljs{border-radius:.4em;max-height:40em;margin:.5em auto;white-space:pre;overflow:auto}.hljs .hjln{cursor:default;text-align:right;float:left;margin:0 1em .1em -1em;border-right:.1em solid;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none}.hljs .hjln span{padding:0 .5em 0 1em;display:block}",
        style = doc.createElement("style");
    style[appendChild](doc.createTextNode(css));
    doc.head[appendChild](style);
    doc[addEventListener]("DOMContentLoaded", function() {
        var code = doc[getElementsByTagName]("code");
        for (var i = 0; i < code.length; i++) {
            var cod = code[i];
            if (typeof hljs != notdefined && cod.className.indexOf("hljs") == -1 && cod.className.indexOf("nohighlight") == -1) {
                cod[addEventListener]("click", function() {
                    if (confirm("Select All?")) {
                        var r = doc.createRange(),
                            s = window.getSelection();
                        s.removeAllRanges();
                        r.setStart(this, 1);
                        r.setEnd(this, this.childNodes.length);
                        s.addRange(r)
                    }
                });
                cod[innerHTML] = cod[innerHTML][replace](/<br[^>]*>$/mgi, "")[replace](/</g, "&lt;")[replace](/>/g, "&gt;")[replace](/"/g, "&quot;");
                hljs.highlightBlock(cod);
                cod[innerHTML] = '<span class="hjln"></span>' + cod[innerHTML];
                var g = cod[innerHTML].split(/\n/).length;
                for (var a = 1; a <= g; a++)(cod[getElementsByTagName]("span")[0])[innerHTML] += "<span>" + a + "</span>"
            }
        }
        if (typeof jQuery != notdefined && jQuery.fn.niceScroll) $("code").niceScroll()
    })
})(document, "undefined", "replace", "innerHTML", "appendChild", "addEventListener", "getElementsByTagName");