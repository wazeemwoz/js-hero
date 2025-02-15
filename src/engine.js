function LevelError(message) {
    const error = new Error(message);
    error.name = "LevelError";
    return error;
}

export const getMoves = function (_map, answer) {
    const map = JSON.parse(JSON.stringify(_map));
    var north = "NORTH", south = "SOUTH", east = "EAST", west = "WEST";
    var mapThings = {
        'p': 'PLAYER',
        'm': 'MONSTER',
        'r': 'ROCK',
        'w': 'TARGET',
        '-': 'NOTHING'
    }
    var moves = [];
    var player = {
        direction: south
    }

    for (var y = 0; y < map.length; y++) {
        for (var x = 0; x < map[y].length; x++) {
            if (map[y][x].startsWith('p')) {
                player.x = x;
                player.y = y;
            }

            if (map[y][x].startsWith('w')) {
                player.target_x = x;
                player.target_y = y;
            }
        }
    }

    if (player.x === undefined || !player.target_x === undefined) {
        throw LevelError("Player or target not found in map");
    }

    function check(x, y, type) {
        if (y >= 0 && y < map.length && x >= 0 && x < map[y].length) {
            if (map[y][x].startsWith(type)) {
                return map[y][x];
            }
        }
    }

    function getMonster(x, y) {
        return check(x - 1, y, 'm') || check(x + 1, y, 'm') || check(x, y - 1, 'm') || check(x, y + 1, 'm');
    }

    function directionToCoords(direction, x, y) {
        switch (direction) {
            case south: return { x: x, y: y + 1 };
            case east: return { x: x + 1, y: y };
            case north: return { x: x, y: y - 1 };
            default: return { x: x - 1, y: y };
        }
    }

    function checkValid(moving) {
        var monster = getMonster(player.x, player.y);
        if (!!monster) {
            moves.push([{ id: monster, action: 'attack' }, { id: 'p', action: 'die' }]);
            moves.push([{ id: monster, action: 'win' }]);
            throw LevelError("Monster killed you!");
        }

        var { x, y } = directionToCoords(player.direction, player.x, player.y);

        if (!!moving && !check(x, y, '-')) {
            moves.push([{ id: 'p', action: 'step_f' }]);
            if (check(x, y, 'w')) {
                if (x - 1 === player.x) {
                    moves.push([{ id: 'w', action: 'turn_r' }]);
                }
                if (x + 1 === player.x) {
                    moves.push([{ id: 'w', action: 'turn_l' }]);
                }
                if (y - 1 === player.y) {
                    moves.push([{ id: 'w', action: 'turn_l' }]);
                    moves.push([{ id: 'w', action: 'turn_l' }]);
                }
                moves.push([{ id: 'w', action: 'attack' }]);
            }
            throw LevelError("Moving to a place you cannot");
        }
    }

    function left(d) {
        switch (d) {
            case south: return east;
            case east: return north;
            case north: return west;
            default: return south;
        }
    }
    function right(d) {
        switch (d) {
            case south: return west;
            case west: return north;
            case north: return east;
            default: return south;
        }
    }

    player.checkMap = (x, y) => {
        if (y >= 0 && y < map.length && x >= 0 && x < map[y].length) {
            var id = map[y][x];
            var type = id.charAt(0);
            return mapThings[type] || "ERROR";
        }
        return "ERROR";
    }

    player.turnLeft = () => {
        player.direction = left(player.direction);
        moves.push([{ id: 'p', action: 'turn_l' }]);
    }

    player.turnRight = () => {
        player.direction = right(player.direction);
        moves.push([{ id: 'p', action: 'turn_r' }]);
    }

    player.step = () => {
        checkValid(true);
        var { x, y } = directionToCoords(player.direction, player.x, player.y);
        map[player.y][player.x] = '-';
        map[y][x] = 'p';
        player.x = x;
        player.y = y;
        moves.push([{ id: 'p', action: 'step' }]);
    }

    player.attack = () => {
        var { x, y } = directionToCoords(player.direction, player.x, player.y);
        if (player.checkMap(x, y) === 'MONSTER') {
            moves.push([{ id: 'p', action: 'attack' }, { id: map[y][x], action: 'die' }]);
            map[y][x] = '-';
        } else {
            moves.push([{ id: 'p', action: 'attack' }]);
        }
        checkValid();
    }

    player.check = (_action) => {
        var action = _action.toUpperCase();

        if (action === 'LEFT') {
            var { x, y } = directionToCoords(left(player.direction), player.x, player.y);
            return player.checkMap(x, y);
        }

        if (action === 'RIGHT') {
            var { x, y } = directionToCoords(right(player.direction), player.x, player.y);
            return player.checkMap(x, y);
        }

        if (action === 'STEP') {
            var { x, y } = directionToCoords(player.direction, player.x, player.y);
            return player.checkMap(x, y);
        }

        return 'ERROR';
    }

    player.isNextToTarget = () => {
        var x = player.x, y = player.y;
        var tx = player.target_x, ty = player.target_y;

        if (((x - 1 === tx) && y === ty)
            || ((x + 1 === tx) && y === ty)
            || ((x === tx) && y - 1 === ty)
            || ((x === tx) && y + 1 === ty)
        ) {
            return true;
        }
        return false;
    }

    let message = null;
    try {
        answer(player);
        var x = player.x;
        var y = player.y;
        if (check(x, y, 'p') && (check(x - 1, y, 'w') || check(x + 1, y, 'w') || check(x, y + 1, 'w') || check(x, y - 1, 'w'))) {
            moves.push([{ id: 'p', action: 'win' }, { id: 'w', action: 'win' }]);
        } else {
            throw LevelError("Failed to reach target");
        }
    } catch (e) {
        message = e.message;
        // const prefix = prefixMessage || ""
        // if (e.name === 'LevelError') {
        //     console.log(prefix + ": " + e.message);
        // } else if (e instanceof SyntaxError || e instanceof ReferenceError) {
        //     console.error(e.message, e.stack)
        // } else {
        //     throw e;
        // }
    }
    if (moves.length == 0) {
        moves.push([{ id: 'p', action: 'die' }]);
    } else {
        const lastMove = moves[moves.length - 1].find(move => move.id == 'p');

        if (!lastMove || (lastMove.action != 'win' && lastMove.action != 'die')) {
            moves.push([{ id: 'p', action: 'die' }]);
        }
    }
    return { moves, message };
}