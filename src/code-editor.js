function $$(id) {
    return window.document.getElementById(id);
}

function CodeEditor(configs, listeners) {
    this.configs = configs || {};
    this.listeners = listeners || {};

    this.editor = null;
    this.debounceTimer = null;

    var self = this;

    function registerCustomLanguage(language) {
        monaco.languages.register({ id: language });
        // Mimic Monaco's built-in Monarch for JavaScript
        // https://github.com/microsoft/monaco-languages
        monaco.languages.setMonarchTokensProvider(language, {
            defaultToken: 'invalid',
            tokenPostfix: '.js',

            keywords: [
                'break',
                'case',
                'catch',
                'class',
                'continue',
                'const',
                'constructor',
                'debugger',
                'default',
                'delete',
                'do',
                'else',
                'export',
                'extends',
                'false',
                'finally',
                'for',
                'from',
                'function',
                'get',
                'if',
                'import',
                'in',
                'instanceof',
                'let',
                'new',
                'null',
                'return',
                'set',
                'super',
                'switch',
                'symbol',
                'this',
                'throw',
                'true',
                'try',
                'typeof',
                'undefined',
                'var',
                'void',
                'while',
                'with',
                'yield',
                'async',
                'await',
                'of'
            ],

            operators: [
                '<=',
                '>=',
                '==',
                '!=',
                '===',
                '!==',
                '=>',
                '+',
                '-',
                '**',
                '*',
                '/',
                '%',
                '++',
                '--',
                '<<',
                '</',
                '>>',
                '>>>',
                '&',
                '|',
                '^',
                '!',
                '~',
                '&&',
                '||',
                '?',
                ':',
                '=',
                '+=',
                '-=',
                '*=',
                '**=',
                '/=',
                '%=',
                '<<=',
                '>>=',
                '>>>=',
                '&=',
                '|=',
                '^=',
                '@'
            ],

            symbols: /[=><!~?:&|+\-*\/\^%]+/,
            escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
            digits: /\d+(_+\d+)*/,
            octaldigits: /[0-7]+(_+[0-7]+)*/,
            binarydigits: /[0-1]+(_+[0-1]+)*/,
            hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

            regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
            regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,

            tokenizer: {
                root: [[/[{}]/, 'delimiter.bracket'], { include: 'common' }],

                common: [
                    // identifiers and keywords
                    [
                        /[a-z_$][\w$]*/,
                        {
                            cases: {
                                '@keywords': 'keyword',
                                '@default': 'identifier'
                            }
                        }
                    ],
                    [/[A-Z][\w\$]*/, 'type.identifier'], // to show class names nicely
                    // [/[A-Z][\w\$]*/, 'identifier'],

                    // whitespace
                    { include: '@whitespace' },

                    // regular expression: ensure it is terminated before beginning (otherwise it is an opeator)
                    [
                        /\/(?=([^\\\/]|\\.)+\/([gimsuy]*)(\s*)(\.|;|\/|,|\)|\]|\}|$))/,
                        { token: 'regexp', bracket: '@open', next: '@regexp' }
                    ],

                    // delimiters and operators
                    [/[()\[\]]/, '@brackets'],
                    [/[<>](?!@symbols)/, '@brackets'],
                    [
                        /@symbols/,
                        {
                            cases: {
                                '@operators': 'delimiter',
                                '@default': ''
                            }
                        }
                    ],

                    // numbers
                    [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
                    [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
                    [/0[xX](@hexdigits)/, 'number.hex'],
                    [/0[oO]?(@octaldigits)/, 'number.octal'],
                    [/0[bB](@binarydigits)/, 'number.binary'],
                    [/(@digits)/, 'number'],

                    // delimiter: after number because of .\d floats
                    [/[;,.]/, 'delimiter'],

                    // strings
                    [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                    [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                    [/"/, 'string', '@string_double'],
                    [/'/, 'string', '@string_single'],
                    [/`/, 'string', '@string_backtick']
                ],

                whitespace: [
                    [/[ \t\r\n]+/, ''],
                    [/\/\*/, 'comment', '@comment'],
                    [/\/\/.*$/, 'comment']
                ],

                comment: [
                    [/[^\/*]+/, 'comment'],
                    [/\*\//, 'comment', '@pop'],
                    [/[\/*]/, 'comment']
                ],

                // We match regular expression quite precisely
                regexp: [
                    [
                        /(\{)(\d+(?:,\d*)?)(\})/,
                        ['regexp.escape.control', 'regexp.escape.control', 'regexp.escape.control']
                    ],
                    [
                        /(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
                        ['regexp.escape.control', { token: 'regexp.escape.control', next: '@regexrange' }]
                    ],
                    [/(\()(\?:|\?=|\?!)/, ['regexp.escape.control', 'regexp.escape.control']],
                    [/[()]/, 'regexp.escape.control'],
                    [/@regexpctl/, 'regexp.escape.control'],
                    [/[^\\\/]/, 'regexp'],
                    [/@regexpesc/, 'regexp.escape'],
                    [/\\\./, 'regexp.invalid'],
                    [/(\/)([gimsuy]*)/, [{ token: 'regexp', bracket: '@close', next: '@pop' }, 'keyword.other']]
                ],

                regexrange: [
                    [/-/, 'regexp.escape.control'],
                    [/\^/, 'regexp.invalid'],
                    [/@regexpesc/, 'regexp.escape'],
                    [/[^\]]/, 'regexp'],
                    [/\]/, { token: 'regexp.escape.control', next: '@pop', bracket: '@close' }]
                ],

                string_double: [
                    [/[^\\"]+/, 'string'],
                    [/@escapes/, 'string.escape'],
                    [/\\./, 'string.escape.invalid'],
                    [/"/, 'string', '@pop']
                ],

                string_single: [
                    [/[^\\']+/, 'string'],
                    [/@escapes/, 'string.escape'],
                    [/\\./, 'string.escape.invalid'],
                    [/'/, 'string', '@pop']
                ],

                string_backtick: [
                    [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
                    [/[^\\`$]+/, 'string'],
                    [/@escapes/, 'string.escape'],
                    [/\\./, 'string.escape.invalid'],
                    [/`/, 'string', '@pop']
                ],

                bracketCounting: [
                    [/\{/, 'delimiter.bracket', '@bracketCounting'],
                    [/\}/, 'delimiter.bracket', '@pop'],
                    { include: 'common' }
                ]
            }
        });
    }

    var language = self.configs.language;
    if (language) {
        registerCustomLanguage(language);
    } else {
        language = 'javascript';
    }

    monaco.editor.defineTheme('custom', {
        base: 'vs',
        inherit: true,
        rules: [{ token: 'comment', foreground: 'aaaaaa', fontStyle: 'italic' }],
        colors: {
            'editorLineNumber.foreground': '#ccc',
            'editor.lineHighlightBackground': '#eaf2fe'
        }
    });

    var element = $$(self.configs.container);

    self.editor = monaco.editor.create(element, {
        language: language,
        folding: false,
        lineNumbersMinChars: 3,
        minimap: {
            enabled: false
        },
        theme: 'custom',
        wordBasedSuggestions: false,
        quickSuggestions: false
    });

    if (self.configs.value) self.editor.getModel().setValue($$(self.configs.value).textContent);

    self.editor.getModel().onDidChangeContent(function () {
        if (self.editor && self.listeners.contentChanged) {
            if (self.debounceTimer) window.clearTimeout(self.debounceTimer);
            self.debounceTimer = window.setTimeout(self.listeners.contentChanged, 200);
        }
    });

    if (self.listeners.cursorMoved) self.editor.onDidChangeCursorPosition(self.listeners.cursorMoved);

    if (self.listeners.ready) self.listeners.ready();
    self.editor.focus();

    this.getValue = function () {
        return self.editor.getModel().getValue();
    };

    this.setValue = function (value) {
        self.editor.getModel().setValue(value);
    };

    this.getCursorOffset = function () {
        var selection = self.editor.getSelection();
        return self.editor.getModel().getOffsetAt(selection.getPosition());
    };

    this.setCursorOffset = function (offset) {
        var pos = self.editor.getModel().getPositionAt(offset);
        self.editor.setSelection(new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column));
    };

    this.getPositionAt = function (offset) {
        return self.editor.getModel().getPositionAt(offset);
    };

    this.markers = [];

    this.clearMarkers = function () {
        self.markers = [];
        monaco.editor.setModelMarkers(self.editor.getModel(), 'code-editor', this.markers);
    };

    this.addErrorMarker = function (message, lineNumber, column) {
        self.markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
            message: message
        });
        monaco.editor.setModelMarkers(self.editor.getModel(), 'code-editor', this.markers);
    };

    this.addInfoMarker = function (message, lineNumber, column) {
        self.markers.push({
            severity: monaco.MarkerSeverity.Info,
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
            message: message
        });
        monaco.editor.setModelMarkers(self.editor.getModel(), 'code-editor', this.markers);
    };

    this.previousDecorations = [];

    this.clearDecorations = function () {
        self.previousDecorations = self.editor.deltaDecorations(self.previousDecorations, []);
    };

    this.createDecoration = function (className, loc) {
        return {
            range: new monaco.Range(loc.start.line, loc.start.column + 1, loc.end.line, loc.end.column + 1),
            options: {
                inlineClassName: className
            }
        };
    };

    this.applyDecorations = function (highlights) {
        self.previousDecorations = self.editor.deltaDecorations(self.previousDecorations, highlights);
    };
}