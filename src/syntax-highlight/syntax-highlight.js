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
        // Prism css: coy theme
        styleArray.push('code[class*=language-],pre[class*=language-]{color:#000;background:0 0;font-family:Consolas,Monaco,"Andale Mono","Ubuntu Mono",monospace;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}code[class*=language]{max-height:inherit;height:100%;display:block;overflow:auto}:not(pre)>code[class*=language-],pre[class*=language-]{background-color:#fdfdfd;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;}:not(pre)>code[class*=language-]{position:relative;padding:.2em;border-radius:.3em;color:#c92c2c;border:1px solid rgba(0,0,0,.1);display:inline;white-space:normal}.token.block-comment,.token.cdata,.token.comment,.token.doctype,.token.prolog{color:#7D8B99}.token.punctuation{color:#5F6364}.token.boolean,.token.constant,.token.deleted,.token.function-name,.token.number,.token.property,.token.symbol,.token.tag{color:#c92c2c}.token.attr-name,.token.builtin,.token.char,.token.function,.token.inserted,.token.selector,.token.string{color:#2f9c0a}.token.entity,.token.operator,.token.url,.token.variable{color:#a67f59;background:rgba(255,255,255,.5)}.token.atrule,.token.attr-value,.token.class-name,.token.keyword{color:#1990b8}.token.important,.token.regex{color:#e90}.language-css .token.string,.style .token.string{color:#a67f59;background:rgba(255,255,255,.5)}.token.important{font-weight:400}.token.bold{font-weight:700}.token.italic{font-style:italic}.token.entity{cursor:help}.namespace{opacity:.7}@media screen and (max-width:767px){pre[class*=language-]:after,pre[class*=language-]:before{bottom:14px;box-shadow:none}}.token.cr:before,.token.lf:before,.token.tab:not(:empty):before{color:#e0d7d1}pre[class*=language-].line-numbers{padding-left:0}pre[class*=language-].line-numbers code{padding-left:3.8em}pre[class*=language-].line-numbers .line-numbers-rows{left:0}pre[class*=language-][data-line]{padding-top:0;padding-bottom:0;padding-left:0}pre[data-line] code{position:relative;padding-left:4em}pre .line-highlight{margin-top:0}');
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
                    const heading = container.querySelector('.heading');
                    heading.style.cursor = 'row-resize';

                    const toggleHide = () => {
                        const shouldHide = diffContent.style.display !== 'none';
                        container.style.marginTop = shouldHide? '0px' : '40px';
                        diffContent.style.display = shouldHide? 'none' : 'block';
                    };

                    heading.onclick = toggleHide;
                    toggleHide();
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
                line.setAttribute('data-refined-bb', true);
            });

            return Promise.resolve(sourceLines);
        });
    }
})();
