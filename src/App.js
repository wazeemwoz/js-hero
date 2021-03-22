import './App.css';
import { renderSequence } from './render-sequence';
import { useState, useEffect, useRef, useCallback } from 'react';
import levels_config from './levels';
import { getMoves } from './engine';
import Editor from "@monaco-editor/react";
import * as esprima from "esprima";
import debounce from 'lodash/debounce';
import loopProtect from './loop-protect';

function calcColors(theme) {
  const themeWithHover = {};
  const keys = Object.keys(theme);
  keys.forEach(key => {
    const hoverKey = `${key}Hover`;
    if (!key.endsWith("Hover") && !theme[hoverKey]) {
      const value = theme[key];
      const tokens = value.split("-");
      const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : "";
      const n = Number.parseInt(lastToken);
      if (!isNaN(n)) {
        tokens[tokens.length - 1] = `${n + 200}`;
        themeWithHover[hoverKey] = tokens.join("-");
      }
      themeWithHover[key] = value;
    }
  })
  return themeWithHover;
}

const mtheme = calcColors({
  headerColor: "regal-blue",
  levelBg: "indigo-50",
  good: "green-500",
  bad: "red-400"
})


function setupMonaco(monaco) {
  function ShowAutocompletion(obj) {
    // Helper function to return the monaco completion item type of a thing
    function getType(thing, isMember) {
      isMember = (isMember == undefined) ? (typeof isMember == "boolean") ? isMember : false : false; // Give isMember a default value of false

      switch ((typeof thing).toLowerCase()) {
        case "object":
          return monaco.languages.CompletionItemKind.Class;

        case "function":
          return (isMember) ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Function;

        default:
          return (isMember) ? monaco.languages.CompletionItemKind.Property : monaco.languages.CompletionItemKind.Variable;
      }
    }

    // Register object that will return autocomplete items 
    monaco.languages.registerCompletionItemProvider('javascript', {
      // Run this function when the period or open parenthesis is typed (and anything after a space)
      triggerCharacters: ['.', '('],

      // Function to generate autocompletion results
      provideCompletionItems: function (model, position, token) {
        // Split everything the user has typed on the current line up at each space, and only look at the last word
        var last_chars = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: 0, endLineNumber: position.lineNumber, endColumn: position.column });
        var words = last_chars.replace("\t", "").split(" ");
        var active_typing = words[words.length - 1]; // What the user is currently typing (everything after the last space)

        // If the last character typed is a period then we need to look at member objects of the obj object 
        var is_member = active_typing.charAt(active_typing.length - 1) == ".";

        // Array of autocompletion results
        var result = [];

        // Used for generic handling between member and non-member objects
        var last_token = obj;
        var prefix = '';

        if (is_member) {
          // Is a member, get a list of all members, and the prefix
          var parents = active_typing.substring(0, active_typing.length - 1).split(".");
          last_token = obj[parents[0]];
          prefix = parents[0];

          // Loop through all the parents the current one will have (to generate prefix)
          for (var i = 1; i < parents.length; i++) {
            if (last_token.hasOwnProperty(parents[i])) {
              prefix += '.' + parents[i];
              last_token = last_token[parents[i]];
            } else {
              // Not valid
              return result;
            }
          }

          prefix += '.';
        }

        // Get all the child properties of the last token
        for (var prop in last_token) {
          // Do not show properites that begin with "__"
          if (last_token.hasOwnProperty(prop) && !prop.startsWith("__")) {
            // Get the detail type (try-catch) incase object does not have prototype 
            var details = '';
            try {
              details = last_token[prop].__proto__.constructor.name;
            } catch (e) {
              details = typeof last_token[prop];
            }

            // Create completion object
            var to_push = {
              label: prefix + prop,
              kind: getType(last_token[prop], is_member),
              detail: details,
              insertText: prop
            };

            // Change insertText and documentation for functions
            if (to_push.detail.toLowerCase() == 'function') {
              to_push.insertText += "()";
              to_push.documentation = (last_token[prop].toString()).split("{")[0]; // Show function prototype in the documentation popup
            }

            // Add to final results
            result.push(to_push);
          }
        }

        return {
          suggestions: result
        };
      }
    });
  }

  ShowAutocompletion({
    player: {
      turnLeft: function turnLeft() { },
      turnRight: function turnRight() { },
      step: function step() { },
      attack: function attack() { },
      isNextToTarget: function isNextToTarget() { },
      check: function check(action) { },
      checkMap: function checkMap(x, y) { },
      x: 0, y: 0, direction: "NORTH", target_x: 0, target_y: 0
    }
  });
}

const initialCode = `
/**
 * player supports the following API
 *      - Functions
 *          - turnLeft()
 *          - turnRight()
 *          - step()
 *          - attack()
 *          - isNextToTarget(): tells you if you are in a winning position
 *          - check(action): Tells you what is at the action you want to check
 *              Argument action: Has to be 'LEFT', 'RIGHT' or 'STEP'
 *              Returns: "MONSTER", "TARGET", "ROCK", "NOTHING" or "ERROR"
 *          - checkMap(x, y): check the thing that is at coordinates x and y
 *              Returns: "MONSTER", "PLAYER", "TARGET", "ROCK", "NOTHING" or "ERROR"
 *      - Properties (variables in player)
 *          - x: number
 *          - y: number
 *          - direction: "NORTH" or "SOUTH" or "EAST" or "WEST"
 *          - target_x
 *          - target_y
 * 
 * @param {*} player 
 */
function solution(player) {
    // Add code here
}
`

const storage = {
  getJsHeroCode: () => {
    const jsHeroCode = window.localStorage.getItem('jsHeroCode');
    if (!jsHeroCode) {
      window.localStorage.setItem('jsHeroCode', initialCode);
      return initialCode;
    }
    return jsHeroCode;

  },
  setJsHeroCode: (jsHeroCode) => {
    window.localStorage.setItem('jsHeroCode', jsHeroCode);
  },
  getCurrentLevel: () => {
    const currentLevel = window.localStorage.getItem('currentLevel');
    if (!currentLevel) {
      window.localStorage.setItem('currentLevel', 1);
      return 1;
    }
    return currentLevel;
  },
  setCurrentLevel: (level) => {
    window.localStorage.setItem('currentLevel', level);
  }
}

function validator(code, severity) {
  var markers = [];
  try {
    const strictCode = "'use strict';" + code;
    var syntax = esprima.parse(strictCode, { tolerant: true, loc: true, range: true });
    if (syntax.errors.length > 0) {
      for (var i = 0; i < syntax.errors.length; ++i) {
        var e = syntax.errors[i];
        markers.push({
          severity: severity,
          startLineNumber: e.lineNumber,
          startColumn: e.column,
          endLineNumber: e.lineNumber,
          endColumn: e.column,
          message: e.description
        });
      }
    }
  } catch (e) {
    markers.push({
      severity: severity,
      startLineNumber: e.lineNumber,
      startColumn: e.column,
      endLineNumber: e.lineNumber,
      endColumn: e.column,
      message: e.toString()
    });
  }
  return markers;
}

function LanguageSelection(props) {
  const classNames = {
    selected: `px-2 border-r border-${mtheme.headerColor} mtk8`,
    unselected: `px-2 border-b-2 border-l border-r border-${mtheme.headerColor} mtk1`
  }
  return (
    <div className="text-sm text-white float-left monaco-editor-background">
      <button className={classNames.selected}>javascript</button>
      <button className={classNames.unselected}>python</button>
    </div>
  )
}

function JsHeroEditor({ updateSolution }) {
  const [code, setCode] = useState(storage.getJsHeroCode());
  const delayedUpdate = useCallback(debounce((code, update) => handleValidation(code, update), 750), []);
  const monacoRef = useRef(null);
  const editorRef = useRef(null);

  const handleEditorWillMount = (monaco) => {
    setupMonaco(monaco);
  }

  const handleEditorDidMount = (editor, monaco) => {
    editor._domElement.id = "code-editor";
    editorRef.current = editor;
    monacoRef.current = monaco;
    handleEditorChange(code);
  }

  const handleValidation = (value, update) => {
    const markers = validator(value, monacoRef.current.MarkerSeverity.Error);
    if (markers.length == 0) {
      update(value);
    } else {
      update(initialCode);
    }
    monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), "code-editor", markers);
  }

  const handleEditorChange = (value) => {
    setCode(value);
    storage.setJsHeroCode(value);
    delayedUpdate(value, updateSolution);
  }

  return (
    <div style={{
      float: "left",
      width: "50%",
      overflow: "scroll",
      flex: "1 1 auto",
      overflowY: "auto",
      minHeight: "100px"
    }} className={`bg-${mtheme.headerColor}`} >
      <LanguageSelection />
      <Editor
        height="100vh"
        defaultLanguage="javascript"
        defaultValue={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        onMount={handleEditorDidMount}

        beforeMount={handleEditorWillMount}
      />
    </div >
  );
}

function LevelToggle({ name, success, onToggle }) {
  const classColor = success ? `bg-${mtheme.good} hover:bg-green-700 text-white` : `bg-red-500 hover:bg-red-700 text-white`;
  return (
    <button onClick={onToggle} className={classColor + " font-bold my-1 mx-2 py-1 px-2 w-28 rounded inline-flex items-center"}>
      {
        success ?
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-smile"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
          : <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-frown"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
      }
      <span className="px-1" >Level {name}</span>
    </button>
  )
}

function LevelDisplay({ message, config, moves }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    renderSequence(canvasRef.current, config, JSON.parse(JSON.stringify(moves)));
  }, [canvasRef.current, config, moves])

  return (
    <div style={{ width: "100%" }}>
      <StatusInfo type="alert" message={message} />
      <canvas
        onClick={() => { renderSequence(canvasRef.current, config, JSON.parse(JSON.stringify(moves))); }}
        ref={canvasRef}
        id="levelDisplayCanvas"
        style={{
          display: "inline-block",
          alignContent: "flex-end"
        }} />
    </div>
  )
}

function Levels({ levelsState, updateLevelState }) {
  const expandedLevelState = levelsState.find(levelState => levelState.isExpanded)
  return (
    <div id="results" style={{
      height: "100vh",
      float: "left",
      width: "50%",
      overflow: "scroll",
    }} className={`bg-${mtheme.levelBg}`}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap"
      }}>
        {
          levelsState.map((levelState, i) => {
            const { success } = levelState;
            const onToggle = () => {
              updateLevelState(i);
            }

            return <LevelToggle
              key={i + 1}
              name={i + 1}
              success={success}
              onToggle={onToggle} />
          })
        }
      </div>
      {!!expandedLevelState ? <LevelDisplay key="canvas" {...expandedLevelState} /> : null}
    </div>
  )
}

function StatusInfo({ message }) {
  if (!message) {
    return null;
  }
  return (<div className="flex items-center bg-red-500 text-white text-sm font-bold px-4 py-3 my-2" role="alert">
    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-alert-circle"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <p className="px-2">{message}</p>
  </div>)
}

function useSolutionFunc() {
  const solutionHarness = (answer) => {
    return (level) => {
      let result
      try {
        result = getMoves(level, answer);
      } catch (e) {
        result.message = e.message;
      }
      return result;
    }
  }
  const [solutionFunc, _setSolutionFunc] = useState({ solution: null });
  const setSolutionFunc = (func) => _setSolutionFunc({ solution: solutionHarness(func) });
  return [solutionFunc.solution, setSolutionFunc];
}

function Header(props) {
  return (
    <header className={`bg-${mtheme.headerColor} content-center`}>
      <nav className="justify-between w-full text-white p-2">
        <a href="/"><span className="font-semibold text-xl tracking-tight">JS Hero</span></a>
        <button className="float-right">
          <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="feather feather-help-circle"><circle cx={12} cy={12} r={10} /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1={12} y1={17} x2="12.01" y2={17} /></svg>
        </button>
      </nav>
    </header>
  )
}

function App() {
  const [failureMessage, setFailureMessage] = useState(null);
  const [solution, setSolutionFunc] = useSolutionFunc();
  const [levelsState, setLevelsState] = useState([]);

  const updateLevelState = (levelClicked) => {
    let currentLevel = storage.getCurrentLevel();
    let allSuccess = true;
    let newLevelsState = [];
    const toggle_i = typeof levelClicked == "number" ? levelClicked : -1;
    for (var i = 0; i < levels_config.length && i <= currentLevel; i++) {
      const { moves, message } = toggle_i < 0 || toggle_i == i ? solution(levels_config[i].design) : levelsState[i];
      const lastAction = moves[moves.length - 1][0];
      const levelPassed = lastAction.action !== 'die';
      const newLevelState = {
        id: "level-" + (i + 1),
        isExpanded: levelsState[i] ? levelsState[i].isExpanded : false,
        message: failureMessage || message,
        success: levelPassed,
        config: levels_config[i],
        moves: moves
      }

      if (levelPassed && allSuccess) {
        currentLevel = Math.max(i + 1, currentLevel);
      } else {
        allSuccess = false;
      }

      if (toggle_i > -1) {
        newLevelState.isExpanded = toggle_i == i ? !newLevelState.isExpanded : false;
      }

      newLevelsState.push(newLevelState);
    }

    storage.setCurrentLevel(currentLevel);
    setLevelsState(newLevelsState);
  }

  useEffect(() => {
    if (solution) {
      updateLevelState(-1);
    }
  }, [solution]);

  function updateSolution(value) {
    const code = loopProtect(value, 10000, "Possible infinite loop detected") + "\nwindow.solution = solution";
    try {
      setFailureMessage(null);
      eval(code);
      if (!window.solution) {
        throw new Error("Solution function not defined, ensure solution function is valid");
      }
      setSolutionFunc(window.solution);
    } catch (e) {
      setFailureMessage(e.message)
    }
  }

  return (
    <div className="App">
      <Header />
      <div>
        <Levels
          levelsState={levelsState}
          updateLevelState={updateLevelState}
        />
        <JsHeroEditor updateSolution={updateSolution} />
      </div>
    </div>
  );
}

export default App;
