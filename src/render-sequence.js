import { Sprite, SpriteSheet, Ticker, Stage, Shape } from "@createjs/easeljs";
import GrassPng from "./assets/grass.png";
import HeroPng from "./assets/player.png";
import HeroinePng from "./assets/princess.png";
import OrcPng from "./assets/orc.png";
import RockPng from "./assets/rock.png";

function getFrames(row, size_x, size_y, count,) {
    var frames = [];
    var offset_y = row * 64;
    for (var i = 0; i < count; i++) {
        frames.push([size_x * i, offset_y, size_x, size_y]);
    }
    return frames;
}

function getFramesAttack(row, size_x, size_y, count) {
    var frames = [];
    var offset_y = (21 * 64) + (row * 192);
    for (var i = 0; i < count; i++) {
        frames.push([size_x * i, offset_y, size_x, size_y, 0, 64, 64]);
    }
    return frames;
}

function Character(spritesheet, x, y, visibleDead) {
    var newAgent = {};
    var ss = new SpriteSheet({
        frames: getFrames(8, 64, 64, 9)
            .concat(getFrames(9, 64, 64, 9))
            .concat(getFrames(10, 64, 64, 9))
            .concat(getFrames(11, 64, 64, 9))
            .concat(getFramesAttack(0, 192, 192, 6))
            .concat(getFramesAttack(1, 192, 192, 6))
            .concat(getFramesAttack(2, 192, 192, 6))
            .concat(getFramesAttack(3, 192, 192, 6))
            .concat(getFrames(20, 64, 64, 6))
            .concat(getFrames(2, 64, 64, 7)),
        animations: {
            stand_u: 0,
            stand_l: 9,
            stand_d: 18,
            stand_r: 27,
            walk_u: [0, 8, "walk_u", 0.5],
            walk_l: [9, 17, "walk_l", 0.5],
            walk_d: [18, 26, "walk_d", 0.5],
            walk_r: [27, 35, "walk_r", 0.5],
            attack_u: [36, 41, "stand_u", 0.5],
            attack_l: [42, 47, "stand_l", 0.5],
            attack_d: [48, 53, "stand_d", 0.5],
            attack_r: [54, 59, "stand_r", 0.5],
            dead: 65,
            death: [60, 65, "dead"],
            victory: [66, 72, "victory", 0.2]
        },
        images: [spritesheet]
    });
    var sprite = new Sprite(ss, "stand_d");
    sprite.x = x;
    sprite.y = y;
    newAgent.x = x;
    newAgent.y = y;
    var direction = 270;
    newAgent.sprite = sprite;
    newAgent.stepFailing = false;
    newAgent.speed = 6;
    newAgent.walkDistance = 64;

    var turn = () => {
        if (direction < 0) {
            direction = 270;
        }
        if (direction > 270) {
            direction = 0;
        }

        switch (direction) {
            case 0: sprite.gotoAndPlay("stand_r"); break;
            case 90: sprite.gotoAndPlay("stand_u"); break;
            case 180: sprite.gotoAndPlay("stand_l"); break;
            default: sprite.gotoAndPlay("stand_d"); break;
        }
    };

    newAgent.isWaiting = () => {
        return sprite.currentAnimation.startsWith("stand") || sprite.currentAnimation.startsWith("dea");
    }

    newAgent.turnLeft = () => {
        if (newAgent.isWaiting()) {
            direction += 90;
            turn();
        }
    };

    newAgent.turnRight = () => {
        if (newAgent.isWaiting()) {
            direction -= 90;
            turn();
        }
    };

    newAgent.stepForward = () => {
        if (newAgent.isWaiting()) {
            switch (direction) {
                case 0:
                    sprite.gotoAndPlay("walk_r");
                    newAgent.x += newAgent.walkDistance;
                    break;
                case 90:
                    sprite.gotoAndPlay("walk_u");
                    newAgent.y -= newAgent.walkDistance;
                    break;
                case 180:
                    sprite.gotoAndPlay("walk_l");
                    newAgent.x -= newAgent.walkDistance;
                    break;
                default:
                    sprite.gotoAndPlay("walk_d");
                    newAgent.y += newAgent.walkDistance;
                    break;
            }
        }
    };

    newAgent.stepFail = () => {
        if (newAgent.isWaiting()) {
            newAgent.stepFailing = true;
            newAgent.stepForward()
        }
    };

    newAgent.attack = () => {
        if (newAgent.isWaiting()) {
            switch (direction) {
                case 0: sprite.gotoAndPlay("attack_r"); break;
                case 90: sprite.gotoAndPlay("attack_u"); break;
                case 180: sprite.gotoAndPlay("attack_l"); break;
                default: sprite.gotoAndPlay("attack_d"); break;
            }
        }
    };

    newAgent.death = () => {
        if (!sprite.currentAnimation.startsWith("dea")) {
            sprite.gotoAndPlay("death");
        }
    };

    newAgent.victory = () => {
        sprite.gotoAndPlay("victory");
    };

    newAgent.tick = () => {
        function dist() {
            return { x: Math.abs(sprite.x - newAgent.x), y: Math.abs(sprite.y - newAgent.y) };
        }
        if (newAgent.stepFailing && dist().x < newAgent.walkDistance / 2 &&
            dist().y < newAgent.walkDistance / 2) {
            newAgent.stepFailing = false;
            if (sprite.x < newAgent.x) {
                newAgent.x -= newAgent.walkDistance;
            } else if (sprite.x > newAgent.x) {
                newAgent.x += newAgent.walkDistance;
            }

            if (sprite.y < newAgent.y) {
                newAgent.y -= newAgent.walkDistance;
            } else if (sprite.y > newAgent.y) {
                newAgent.y += newAgent.walkDistance;
            }
        }
        if (sprite.x !== newAgent.x) {
            var move_x = Math.min(newAgent.speed, dist().x);
            sprite.x += sprite.x > newAgent.x ? move_x * -1 : move_x;
        }
        if (sprite.y !== newAgent.y) {
            var move_y = Math.min(newAgent.speed, dist().y);
            sprite.y += sprite.y > newAgent.y ? move_y * -1 : move_y;;
        }

        if (sprite.currentAnimation.startsWith("walk") &&
            sprite.x === newAgent.x && sprite.y === newAgent.y) {
            sprite.gotoAndPlay(sprite.currentAnimation.replace("walk", "stand"));
        }

        if (!visibleDead && sprite.currentAnimation === "dead" && sprite.alpha > 0) {
            sprite.alpha -= 0.1;
        }
    }

    return newAgent;
}

function Obstacle(spritesheet, x, y) {
    var newAgent = {};
    var ss = new SpriteSheet({
        frames: getFrames(0, 64, 64, 1),
        animations: {
            normal: 0
        },
        images: [spritesheet]
    });
    var sprite = new Sprite(ss, "normal");
    sprite.x = x;
    sprite.y = y;
    newAgent.sprite = sprite;
    newAgent.isWaiting = () => {
        return true;
    }

    newAgent.coords = () => {
        return { x: sprite.x, y: sprite.y };
    };

    newAgent.tick = () => {
    }
    return newAgent;
}

function drawGrass(maxx, maxy, stage) {
    var ss = new SpriteSheet({
        frames: getFrames(0, 64, 64, 1),
        animations: {
            normal: 0
        },
        images: [GrassPng]
    });

    for (var y = 0; y < maxy; y += 64) {
        for (var x = 0; x < maxx; x += 64) {
            var sprite = new Sprite(ss, "normal");
            sprite.x = x;
            sprite.y = y;
            stage.addChild(sprite);
        }
    }
}

function getGrid(width, height) {
    var square = new Shape();
    var sdraw = square.graphics
        .beginFill("white");
    square.alpha = 0.5;

    for (var y = 0; y < height; y += 64) {
        var offset = y % 128;
        var shouldDraw = true;
        for (var x = offset; x < width; x += 64) {
            if (shouldDraw) {
                sdraw = sdraw.drawRect(x, y, 64, 64);
                shouldDraw = false;
            } else {
                shouldDraw = true;
            }
        }
    }
    return square;
}

function Agents(design) {
    var agentDict = {};
    var agents = [];
    var container = {};

    for (var y = 0; y < design.length; y++) {
        for (var x = 0; x < design[y].length; x++) {
            var id = design[y][x];
            if (!!id) {
                var type = id.charAt(0);
                var created = null;
                switch (type) {
                    case 'p': created = Character(HeroPng, x * 64, y * 64, true); break;
                    case 'r': created = Obstacle(RockPng, x * 64, y * 64); break;
                    case 'w': created = Character(HeroinePng, x * 64, y * 64); break;
                    case 'm': created = Character(OrcPng, x * 64, y * 64); break;
                    default: break;
                }

                if (!!created) {
                    agents.push(created);
                    agentDict[id] = created;
                }
            }
        }
    }

    container.isWaiting = () => agents.every(agent => agent.isWaiting())
    container.tick = () => { agents.forEach(agent => agent.tick()) }
    container.getById = (id) => agentDict[id]
    container.forEach = (block) => { agents.forEach(block) }
    return container;
}

export function renderSequence(canvas, level, moves) {
    var stage = new Stage(canvas.id);

    canvas.width = level.width;
    canvas.height = level.height;

    drawGrass(level.width, level.height, stage);
    stage.addChild(getGrid(level.width, level.height));

    var agents = Agents(level.design);
    agents.forEach(agent => {
        stage.addChild(agent.sprite);
    });

    Ticker.on("tick", stage);
    Ticker.addEventListener("tick", handleTick);

    var delayBetweenMoves = 6;
    var counter = delayBetweenMoves;

    function handleTick(event) {
        agents.tick();
        if (agents.isWaiting() && counter === 0 && moves.length > 0) {
            var batchedMoves = moves.shift();
            batchedMoves.forEach(move => {
                var { id, action } = move;
                var agent = agents.getById(id);
                if (!agent) {
                    throw new Error("Element not found in agents at coords (id: " + id + ")");
                }

                switch (action) {
                    case "turn_l": agent.turnLeft(); break;
                    case "turn_r": agent.turnRight(); break;
                    case "step": agent.stepForward(); break;
                    case "step_f": agent.stepFail(); break;
                    case "attack": agent.attack(); break;
                    case "win": agent.victory(); break;
                    case "die": agent.death(); break;
                    default: agents.getById('p').death(); break;
                }
            })
            counter = delayBetweenMoves;
        }
        stage.update();
        if (agents.isWaiting() && counter > 0) {
            counter -= 1;
        }
    }
}

export default renderSequence;