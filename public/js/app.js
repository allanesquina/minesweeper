let App = angular.module('mineApp', []);

App.service('GameEngine', function() {

    return class GameEngine {
        constructor() {
            this.matrix;
            this.matrixSize = 8;
            this.minesBag = [];
            this.disarmBag = [];
            this.inGame = false;
            this.amountMines = 8;
            this.currentTime = 5 * 60 * 1000;
        }

        newGame() {
            this.minesBag = [];
            this.disarmBag = [];
            this.createMatrix();
            this.layMines();
            this.countMines();
            this.inGame = true;
        }

        createMatrix() {
            this.matrix = [];
            for (let i = 0; i < this.matrixSize; i++) {
                for (let j = 0; j < this.matrixSize; j++) {
                    this.matrix[i] = this.matrix[i] || [];
                    this.matrix[i][j] = {
                        x: i,
                        y: j,
                        state: 0,
                        type: -1
                    };
                }
            }
        }

        expose(x, y) {
            const block = this.matrix[x][y];
            if (block && this.inGame && block.state !== 2) {
                if (block.type === 0) {
                    this.gameOver();
                    return false;
                }
                if (block.type >= 1) {
                    block.state = 1;
                    this.checkDisarm();
                    return true;
                }
                if (block.type === -1) {
                    this.getNeighbor(x, y)
                    this.checkDisarm();
                    return true;
                }
            }
            return true;
        }

        getNeighbor(x, y) {
            let blocks = [];

            let mines = 0;
            let posx;
            let posy;

            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    posx = (x - 1) + j;
                    posy = (y - 1) + i;

                    if (this.matrix[posx] && this.matrix[posx][posy] && this.matrix[posx][posy].state === 0) {
                        blocks.push(this.matrix[posx][posy]);
                    }
                }
            }

            this.analizeBlocks(blocks);
        }

        gameOver() {
            this.inGame = false;
            this.minesBag.map((mine) => mine.state = 1);
        }

        getExposed() {
            let out = 0;
            for (let i = 0; i < this.matrixSize; i++) {
                for (let j = 0; j < this.matrixSize; j++) {
                    if (this.matrix[i][j].state === 1) {
                        out++;
                    }
                }
            }
            return out;
        }

        analizeBlocks(blocks) {
            blocks.map((block) => {
                // if is not disarmed
                if (block.state !== 2) {
                    // If is a mine
                    if (block.type === 0) {
                        return 'mine';
                    }
                    // if is a number
                    if (block.type >= 1) {
                        block.state = 1;
                    }
                    // if is empty
                    if (block.type === -1) {
                        block.state = 1;
                        this.getNeighbor(block.x, block.y)
                    }
                }
            })
        }

        randomBetween(a, b) {
            return Math.floor(Math.random() * b) + a;
        }

        layMines() {
            let x, y, block;
            for (let i = 0; i < this.amountMines; i++) {
                x = this.randomBetween(0, this.amountMines);
                y = this.randomBetween(0, this.amountMines);
                block = this.matrix[x][y];
                block.type = 0;
                this.minesBag.push(block);
            }

        }

        countMines() {
            let mines;
            for (let i = 0; i < this.matrixSize; i++) {
                for (let j = 0; j < this.matrixSize; j++) {
                    if (this.matrix[i][j].type !== 0) {
                        mines = this.getNeighborMines(i, j);
                        if (mines > 0) {
                            this.matrix[i][j].type = mines;
                        }
                    }
                }
            }
        }

        win() {
            this.inGame = false;
            console.log('win');
        }

        checkDisarm() {
            let disarmed = this.minesBag.filter((mine) => contains(mine, this.disarmBag));
            if (disarmed.length === this.minesBag.length) {
                if ((this.matrixSize * this.matrixSize) - this.getExposed() === this.minesBag.length) {
                    this.win();
                }
            }
        }

        disarm(x, y) {
            let block = this.matrix[x][y];
            if (block.state !== 1) {
                if (contains(block, this.disarmBag)) {
                    block.state = 0;
                    this.disarmBag = this.disarmBag.filter((b) => b !== block);
                } else {
                    block.state = 2;
                    this.disarmBag.push(block);
                }
            }
            this.checkDisarm();
        }

        getNeighborMines(x, y) {
            let mines = 0;
            let posx;
            let posy;

            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 3; j++) {
                    posx = (x - 1) + j;
                    posy = (y - 1) + i;

                    if (this.matrix[posx] && this.matrix[posx][posy] && this.matrix[posx][posy].type === 0) {
                        mines++;
                    }
                }
            }
            return mines;
        }
    }
});


App.controller('MineController', ['$scope', 'GameEngine','$interval', function($scope, GameEngine, $interval) {


    game = new GameEngine();

    let interval;
    const stage = document.getElementById('stage');
    stage.oncontextmenu = () => false;


    $scope.newGame = () => {
        game.newGame();
        $scope.gameEnd = false;
        $scope.matrix = game.matrix;
        $scope.currentTime = game.currentTime;
        $interval.cancel(interval);
        interval = $interval(() => {
          if ($scope.currentTime > 0) {
            $scope.currentTime = $scope.currentTime - 1000;
          } else {
            $interval.cancel(interval);
            game.gameOver();
          }
        }, 1000);
    }

    $scope.timeDisplay = () => {
      return millisToMinutesAndSeconds($scope.currentTime);
    }

    $scope.expose = (x, y) => {
        if (!game.expose(x, y)) {
            $scope.gameOver();
        }
    }

    $scope.gameOver = () => {
        $scope.gameEnd = true;
    }

    $scope.showType = (col) => {
        return col.state === 1 && col.type !== -1;
    }

    $scope.disarm = (col) => {
        game.disarm(col.x, col.y)
    }

    $scope.newGame();

}])

App.directive('ngRightClick', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngRightClick);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {
                    $event: event
                });
            });
        });
    };
});

function contains(obj, list) {
    var i;
    for (i = 0, l = list.length; i < l; i++) {
        if (list[i] === obj) {
            return true;
        }
    }
    return false;
}

// http://stackoverflow.com/questions/21294302/converting-soundclouds-
// milliseconds-to-minutes-and-seconds-with-javascript
function millisToMinutesAndSeconds (millis) {
  const minutes = Math.floor(millis / 60000)
  const seconds = ((millis % 60000) / 1000).toFixed(0)
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds
}
