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
    player.turnLeft();
    player.turnLeft();
    var keepWalking = true;
    while (keepWalking) {
        if (player.isNextToTarget()) {
            keepWalking = false;
        } else {
            if (player.target_y === player.y) {
                if (player.direction === "NORTH") {
                    if (player.target_x > player.x) {
                        player.turnRight();
                    } else {
                        player.turnLeft();
                    }
                }
            }
            if (player.check('STEP') === 'ROCK') {
                if (player.check('LEFT') === 'NOTHING') {
                    stepAroundLeft(player);
                } else {
                    stepAroundRight(player);
                }
            } else {
                step(player);
            }
        }
    }
}

function step(player) {
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

function stepAroundRight(player) {
    player.turnRight();
    step(player);
    player.turnLeft();
    step(player);
    step(player);
    player.turnLeft();
    step(player);
    player.turnRight();
}

function stepAroundLeft(player) {
    player.turnLeft();
    step(player);
    player.turnRight();
    step(player);
    step(player);
    player.turnRight();
    step(player);
    player.turnLeft();
}