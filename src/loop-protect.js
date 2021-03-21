import { parse, visit, types, print } from "recast";
const n = types.namedTypes;
const b = types.builders;

function protect(limit, errorMessage) {
    return function (path) {
        if (!path.node.loc) {
            // I don't really know _how_ we get into this state
            // but https://jsbin.com/mipesawapi/1/ triggers it
            // and the node, I'm guessing after translation,
            // doesn't have a line in the code, so this blows up.
            return;
        }
        const id = `_var${Math.random().toString(36).substring(2, 8)}`;
        const before = parse(`var ${id} = 0;`).program.body[0];
        const inside = parse(`${id}++;if(${id} > ${limit}){ throw new Error('${errorMessage}') }`).program.body;
        const body = path.get('body');

        // if we have an expression statement, convert it to a block
        if (!n.BlockStatement.check(body.node)) {
            body.replace(b.blockStatement([body.node]));
        }
        path.insertBefore(before);
        body.node.body.unshift(...inside);
        this.traverse(path);
    };
}

export const loopProtect = (code, limit, errorMessage) => {
    const t = parse(code);

    visit(t, {
        visitWhileStatement: protect(limit, errorMessage),
        visitForStatement: protect(limit, errorMessage),
        visitDoWhileStatement: protect(limit, errorMessage),
        visitForInStatement: protect(limit, errorMessage),
        visitForOfStatement: protect(limit, errorMessage)
    })

    return print(t).code;
};

export default loopProtect;