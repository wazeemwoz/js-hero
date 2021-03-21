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
    var map = initiateMap(player);
    map[player.target_x][player.target_y] = 0;

    var moves = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    var q = [];
    q.push({ x: player.target_x, y: player.target_y });
    var firstNode = true;
    while (q.length > 0) {
        var position = q.shift();
        var x = position.x, y = position.y;

        if (map[x][y] == 1000 || firstNode) {
            firstNode = false;
            for (var i = 0; i < moves.length; i++) {
                var next = player.checkMap(x + moves[i][0], y + moves[i][1])
                if (next == 'NOTHING' || next == 'TARGET' || next == 'MONSTER') {
                    map[x][y] = Math.min(map[x + moves[i][0]][y + moves[i][1]] + 1, map[x][y]);
                    q.push({ x: x + moves[i][0], y: y + moves[i][1] });
                }
            }
        }
    }

    while (!player.isNextToTarget()) {
        var x = player.x, y = player.y;
        var direction;
        var minDist = 1000;
        if (player.checkMap(x, y - 1) == 'NOTHING' && minDist > map[x][y - 1]) {
            direction = 'NORTH';
            minDist = map[x][y - 1];
        }

        if (player.checkMap(x + 1, y) == 'NOTHING' && minDist > map[x + 1][y]) {
            direction = 'EAST';
            minDist = map[x + 1][y];
        }

        if (player.checkMap(x, y + 1) == 'NOTHING' && minDist > map[x][y + 1]) {
            direction = 'SOUTH';
            minDist = map[x][y + 1];
        }

        if (player.checkMap(x - 1, y) == 'NOTHING' && minDist > map[x - 1][y]) {
            direction = 'WEST';
            minDist = map[x - 1][y];
        }

        step(player, direction);
    }
}

function step(player, direction) {
    while (direction && player.direction != direction) {
        player.turnRight();
    }
    player.step();
    if (player.check('STEP') === 'MONSTER') {
        player.attack();
    }
    if (player.check('LEFT') === 'MONSTER') {
        player.turnLeft();
        player.attack();
        player.turnRight();
    }
    if (player.check('RIGHT') === 'MONSTER') {
        player.turnRight();
        player.attack();
        player.turnLeft();
    }
}

function initiateMap(player) {
    var map = [];
    for (var i = 0; player.checkMap(i, 0) != "ERROR"; i++) {
        map[i] = [];
        for (var n = 0; player.checkMap(i, n) != "ERROR"; n++) {
            map[i][n] = 1000;
        }
    }
    return map;
}