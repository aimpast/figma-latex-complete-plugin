import * as React from 'react';
const mathjax = require('mathjax-full/js/mathjax.js').mathjax;
const TeX = require('mathjax-full/js/input/tex.js').TeX;
const SVG = require('mathjax-full/js/output/svg.js').SVG;
const liteAdaptor = require('mathjax-full/js/adaptors/liteAdaptor.js').liteAdaptor;
const RegisterHTMLHandler = require('mathjax-full/js/handlers/html.js').RegisterHTMLHandler;
const AllPackages = require('mathjax-full/js/input/tex/AllPackages.js').AllPackages;
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-latex';
import 'ace-builds/src-noconflict/theme-textmate';
import 'ace-builds/src-noconflict/ext-searchbox';
import langTools from 'ace-builds/src-noconflict/ext-language_tools';
import '../styles/ui.css';

import symbols from '../../symbols.json';
import {Range} from 'ace-builds';

declare function require(path: string): any;

const App = ({}) => {
    const [convert, setConvert] = React.useState(null);
    React.useEffect(() => {
        // https://github.com/mathjax/MathJax-demos-node/blob/master/direct/tex2svg
        const adaptor = liteAdaptor();
        RegisterHTMLHandler(adaptor);
        const tex = new TeX({
            inlineMath: [['$', '$']],
            displayMath: [['$$', '$$']],
            processEscapes: true,
            packages: AllPackages,
        });
        const svg = new SVG({fontCache: 'none'});
        const html = mathjax.document('', {InputJax: tex, OutputJax: svg});
        const formatText = (input: string) => {
            // 再帰的にテキストを処理する関数
            function recursiveFormat(text: string): string {
                // 最初の数式を見つける
                const mathMatch = text.match(/\$(.*?)\$/);
                if (!mathMatch || typeof mathMatch.index === 'undefined') {
                    // 数式がなければ通常のテキスト処理を行う
                    return formatNonMathText(text);
                }

                // 数式前のテキストを取得してフォーマット
                const beforeMath = text.slice(0, mathMatch.index);
                const formattedBeforeMath = formatNonMathText(beforeMath);

                // 数式をプレースホルダーに置き換え
                const placeholder = `{${mathMatch[1]}}`;

                // 数式後のテキストを再帰的に処理
                const afterMath = text.slice(mathMatch.index + mathMatch[0].length);
                const formattedAfterMath = recursiveFormat(afterMath);

                // 最終的な結果を組み立て
                return formattedBeforeMath + placeholder + formattedAfterMath;
            }

            // 英数字記号とそれ以外の文字を分けるための関数
            function formatNonMathText(nonMathText: string): string {
                const splitRegex = /([a-zA-Z0-9\+\-\*\/\=\!\?\.\,\;\:\s]+|[^a-zA-Z0-9\+\-\*\/\=\!\?\.\,\;\:\s]+)/g;
                const segments = nonMathText.split(splitRegex).filter(Boolean);

                return segments
                    .map(segment => {
                        if (/^[\s\t]+?$/.test(segment)) {
                            return '';
                        }

                        if (/^[a-zA-Z0-9\+\-\*\/\=\!\?\.\,\;\:\s]+$/.test(segment)) {
                            // 半角英数字記号のみ
                            return `\\text{${segment}}`;
                        } else {
                            // それ以外の文字
                            return `\\text{${segment}}`;
                        }
                    })
                    .join(' ');
            }

            return recursiveFormat(input);
        };
        const cv = (input: string) => {
            const modified_input = formatText(input);
            console.log(modified_input);
            const node = html.convert(modified_input, {display: true});
            return adaptor.innerHTML(node);
        };
        setConvert(() => cv);
        onmessage = event => {
            const msg = event.data.pluginMessage;
            switch (msg.type) {
                case 'source':
                    setCode(msg.value);
            }
        };
    }, []);

    const [code, setCode] = React.useState('');
    const [preview, setPreview] = React.useState('');

    const onChange = React.useCallback(
        (value: string) => {
            setCode(value);
            setPreview(convert(value));
        },
        [convert]
    );
    const onCreate = React.useCallback(() => {
        // const count = parseInt(textbox.current.value, 10);
        const node = convert(code);

        const mergeTextElementsWithinMText = (code: SVGSVGElement) => {
            const gElements = code.querySelectorAll('g[data-mml-node="mtext"]');

            gElements.forEach(g => {
                const textElements = g.querySelectorAll('text');
                if (textElements.length > 1) {
                    let mergedTextContent = '';

                    // すべてのテキスト内容を結合
                    textElements.forEach(text => {
                        mergedTextContent += text.textContent || '';
                    });

                    // 最初のテキスト要素に結合した内容を設定
                    const firstTextElement = textElements[0];
                    firstTextElement.textContent = mergedTextContent;
                    firstTextElement.setAttribute('font-size', '3200px');

                    // 最初の要素以外を削除
                    for (let i = 1; i < textElements.length; i++) {
                        textElements[i].remove();
                    }
                } else if (textElements.length === 1) {
                    textElements[0].setAttribute('font-size', '3200px');
                }
            });

            const gElementsMerged = code.querySelectorAll('g[data-mml-node="math"] > g');
            const scale = 1.35;

            if (gElementsMerged) {
                gElementsMerged.forEach(g => {
                    const transformAttr = g.getAttribute('transform');
                    if (transformAttr && /translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.test(transformAttr)) {
                        const newTransform = transformAttr.replace(
                            /translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/,
                            (_, x, y) => {
                                const newX = parseFloat(x) * scale; // X座標をスケール倍

                                let newY = parseFloat(y);
                                if (g.getAttribute('data-mml-node') === 'TeXAtom') {
                                    newY = parseFloat(y); // Y座標から500を引く
                                } else {
                                    newY = parseFloat(y); // Y座標から500を引く
                                }
                                return `translate(${newX},${newY})`;
                                return `translate(${newX},${newY})`;
                            }
                        );
                        g.setAttribute('transform', newTransform);
                    }
                });
            }

            //const mathElements = code.querySelectorAll('g[data-mml-node="math"] > g[data-mml-node="TeXAtom"]');
            //mathElements.forEach(g => {
            //  const mathAttribute = g.getAttribute('transform');
            //  if (!mathAttribute) {
            //    g.setAttribute("transform", `scale(1.1)`);
            //  }
            //  else {
            //    g.setAttribute("transform", `${mathAttribute} scale(1.1)`);
            //  }
            //});

            // const svgElement = code.querySelector('svg');
            const viewBox = code.getAttribute('viewBox');
            const parts = viewBox.split(' ');
            const newViewBox = `${parts[0]} ${parts[1]} ${parseFloat(parts[2]) * 2.25} ${parts[3]}`;
            code.setAttribute('viewBox', newViewBox);

            //const width = code.getAttribute('width');
            //const height = code.getAttribute('height');
            //code.setAttribute('width', `${parseFloat(width) * 10}`);
            //code.setAttribute('height', `${parseFloat(height) * 0.5}`);
        };

        console.log(node);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = node;
        const svgNode = tempDiv.querySelector('svg');
        if (svgNode) {
            mergeTextElementsWithinMText(svgNode);
        }
        const modifiedNode = svgNode.outerHTML;

        console.log(modifiedNode);

        parent.postMessage(
            {pluginMessage: {type: 'create-latex-svg', svg: modifiedNode, source: code, scale: 200}},
            '*'
        );
    }, [convert, code]);

    const onCancel = React.useCallback(() => {
        parent.postMessage({pluginMessage: {type: 'cancel'}}, '*');
    }, []);

    const onLoad = React.useCallback(() => {
        langTools.setCompleters([
            {
                // @ts-ignore
                getCompletions: (e, session, pos, prefix, cb) => {
                    if (prefix.length === 0) {
                        cb(null, []);
                        return;
                    }
                    const preceding = session.getTextRange(new Range(pos.row, pos.column - 2, pos.row, pos.column - 1));
                    const filtered = symbols
                        .filter((symbol: string) => symbol.includes(prefix))
                        .map((symbol: string) => ({
                            caption: symbol,
                            value: preceding === '\\' ? symbol.substring(1) : symbol,
                            meta: 'LaTeX',
                        }));
                    cb(null, filtered);
                },
                activated: true,
            },
        ]);
    }, []);

    return (
        <div>
            <AceEditor
                mode="latex"
                theme="textmate"
                onChange={onChange}
                value={code}
                width="100%"
                height="65px"
                showGutter={false}
                focus={true}
                wrapEnabled={true}
                onLoad={onLoad}
                enableBasicAutocompletion={false}
                enableLiveAutocompletion={true}
                placeholder="Type your LaTeX here... The equation should be enclosed with $..."
            />
            <div
                style={{
                    height: '75px',
                    width: '100%',
                    border: '1px solid gray',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{__html: preview}}
            />
            <div style={{paddingTop: '10px'}}>
                <button className="primary" onClick={onCreate}>
                    Create
                </button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default App;
