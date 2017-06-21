/* global Prism */

'use strict';

const waitForRender = require('../wait-for-render');
const pubsub = require('../pubsub');
const debounce = require('../debounce');
const sourceHandler = require('./source-handler');

let debouncedSideDiffHandler = null;

module.exports = (function syntaxHighlight() {
    pubsub.subscribe('highlight-all', highlightAll);
    pubsub.subscribe('highlight', highlightSome);
    pubsub.subscribe('highlight-side-diff', highlightSideDiff);
    pubsub.subscribe('highlight-side-diff', listenForSideDiffScroll);

    return {
        init() {
            insertStyles();
            highlightAll();
        }
    };

    function insertStyles() {
        let head = document.getElementsByTagName('head')[0];
        let lastHeadElement = head.lastChild;
        let style = document.createElement('style');
        const styleArray = [];
        style.type = 'text/css';
        // Prism css: okaidia theme
        styleArray.push('code[class*=language-],pre[class*=language-]{color:#f8f8f2;background:0 0;text-shadow:0 1px rgba(0,0,0,.3);font-family:Consolas,Monaco,"Andale Mono","Ubuntu Mono",monospace;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}pre[class*=language-]{padding:1em;margin:.5em 0;overflow:auto;border-radius:.3em}:not(pre)>code[class*=language-],pre[class*=language-]{background:#272822}:not(pre)>code[class*=language-]{padding:.1em;border-radius:.3em;white-space:normal}.token.cdata,.token.comment,.token.doctype,.token.prolog{color:#708090}.token.punctuation{color:#f8f8f2}.namespace{opacity:.7}.token.constant,.token.deleted,.token.property,.token.symbol,.token.tag{color:#f92672}.token.boolean,.token.number{color:#ae81ff}.token.attr-name,.token.builtin,.token.char,.token.inserted,.token.selector,.token.string{color:#a6e22e}.language-css .token.string,.style .token.string,.token.entity,.token.operator,.token.url,.token.variable{color:#f8f8f2}.token.atrule,.token.attr-value,.token.function{color:#e6db74}.token.keyword{color:#66d9ef}.token.important,.token.regex{color:#fd971f}.token.bold,.token.important{font-weight:700}.token.italic{font-style:italic}.token.entity{cursor:help}');
        // Custom css to fix some layout problems because of the insertion of <code> element
        styleArray.push('pre>code{border-radius:initial;display:initial;line-height:initial;margin-left:initial;overflow-y:initial;padding:initial}code,tt{background:initial;border:initial}.refract-container .deletion pre.source {background-color: #fff1f2 !important;} .refract-container .addition pre.source { background-color: #e8ffe8;}');
        style.innerHTML = styleArray.join('');
        head.insertBefore(style, lastHeadElement);
        head = null;
        lastHeadElement = null;
        style = null;
    }

    function highlightAll() {
        Promise.all([classifyDiffContainers(), transformPreElements()])
        .then(() => Prism.highlightAll());
    }

    function listenForSideDiffScroll(args) {
        waitForRender('div.aperture-pane-scroller').then(() => {
            const scrollers = Array.from(document.querySelectorAll('div.aperture-pane-scroller'));

            if (debouncedSideDiffHandler) {
                scrollers.forEach(scroller => {
                    scroller.removeEventListener('scroll', debouncedSideDiffHandler);
                });
            }

            debouncedSideDiffHandler = debounce(() => highlightSideDiff(args), 250);

            scrollers.forEach(scroller => {
                scroller.addEventListener('scroll', debouncedSideDiffHandler);
            });
        });
    }

    function highlightSideDiff(args) {
        waitForRender(args.diffNode).then(() => {
            const container = document.querySelector(args.diffNode);

            const languageClass = sourceHandler.getClassBasedOnExtension(args.container) || '';
            container.classList.add(languageClass);

            waitForRender(`${args.diffNode}  pre`).then(() => {
                const sourceLines = Array.from(document.querySelectorAll(`${args.diffNode} pre:not([class*=language])`));

                sourceLines.forEach(line => {
                    const codeElement = sourceHandler.getCodeElementFromPre(line);
                    line.innerHTML = codeElement.outerHTML;
                    line.classList.add('source');
                    Prism.highlightElement(line);
                });
            });
        });
    }

    function highlightSome() {
        transformPreElements().then(sourceLines => {
            sourceLines.forEach(line => Prism.highlightElement(line));
        });
    }


    function classifyDiffContainers() {
        return waitForRender('.bb-udiff').then(() => {
            const containers = Array.from(document.querySelectorAll('.bb-udiff:not([class*=language])'));
            const REGEX_ASSETS = /\.(png|jpg|svg|snap)$/i;

            containers.forEach(container => {
                const containerClass = container.getAttribute('class');
                const isAssetDiff = REGEX_ASSETS.test(container.getAttribute('data-filename'));


                if(isAssetDiff) {
                    const diffContent = container.querySelector('.diff-content-container');

                    container.querySelector('.heading').onclick = () => {
                        diffContent.style.display = diffContent.style.display === 'block'? 'none' : 'block';
                    };

                    diffContent.style.display = 'none';
                    diffContent.style.cursor = 'row-resize';
                } else {
                    const languageClass = sourceHandler.getClassBasedOnExtension(container) || '';
                    if (containerClass.indexOf(languageClass) === -1) {
                        container.setAttribute('class', `${containerClass} ${languageClass}`);
                    }
                }
            });

            return Promise.resolve();
        });
    }

    function transformPreElements() {
        return waitForRender('.source').then(() => {
            const sourceLines = Array.from(document.querySelectorAll('.source:not([class*=language])'));

            sourceLines.forEach(line => {
                const codeElement = sourceHandler.getCodeElementFromPre(line);
                line.innerHTML = codeElement.outerHTML;
            });

            return Promise.resolve(sourceLines);
        });
    }
})();
