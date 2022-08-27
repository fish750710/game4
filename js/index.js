(function () {
  const top = $(".section1").offset().top;
  $(".badge").on("click", function () {
    Com.browserRedirect()
      ? window.scrollTo(0, top - 140)
      : window.scrollTo(0, top + 150);
  });
  const btnStart = document.querySelector(".btn-start");
  const touchPad = document.querySelector(".touch-pad");
  const bg = document.querySelector(".bg");
  const btnRestart = document.querySelector(".btn-restart");
  const btnAgain = document.querySelector(".btn-again");
  const btnService = document.querySelector(".btn-service");
  const btnExit = document.querySelector(".btn-exit-m");
  const totalNum = document.querySelector(".total");
  const popMsg = document.querySelector(".popMsg");
  let scale = 1;
  let DEFAULT_WIDTH = 800;
  let DEFAULT_HEIGHT = 420;
  let FPS = 60;
  if (Com.browserRedirect()) {
    // mobile
    DEFAULT_WIDTH =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    DEFAULT_HEIGHT = 750;
    scale = 0.5;
  }
  function Runner(containerSelector, opt_config) {
    this.outerContainerEl = document.querySelector(containerSelector);
    this.containerEl = null;
    this.config = opt_config || Runner.config;
    this.dimensions = Runner.defaultDimensions;
    this.time = 0;
    this.currentSpeed = this.config.SPEED;
    this.activated = false;
    this.playing = false;
    this.crashed = false;
    this.paused = false;
    this.runningTime = 0; //遊戲執行時間
    this.distanceMeter = null; //計分 距離
    this.distanceRan = 0; //遊戲移動距離
    this.msPerFrame = 1000 / FPS;
    this.tRex = null;
    this.loadImages(); //必須放最後，載入 sprite圖並 init
  }
  window["Runner"] = Runner;
  Runner.config = {
    SPEED: 3.4, // 移動速度 6
    // SPEED2: 2, //雲移動速度
    GAP_COEFFICIENT: 0.6, //障礙物間隙係數
    MAX_OBSTACLE_DUPLICATION: 2, // 障碍物相邻的最大重复
    CLEAR_TIME: 3000,            // 游戏开始后，等待三秒再绘制障碍物
    MAX_SPEED: 6.2,               // 游戏的最大速度
    ACCELERATION: 0.0005,         // 加速度
    BOTTOM_PAD: 10,     // 小恐龙距 canvas 底部的距离
  };
  Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: DEFAULT_HEIGHT,
  };
  Runner.classes = {
    CONTAINER: "runner-container",
    CANVAS: "runner-canvas",
    PLAYER: "", // 預留出的 className，用來控制 canvas 的樣式
  };
  // 雪碧图中图片的坐标信息
  Runner.spriteDefinition = {
    LDPI: {
        HORIZON: { x: 0, y: 99 }, // 地面
        CLOUD: {x: 1250, y: 54},
        MONEY_SMALL: {x: 2, y: 40}, // 小 ¥
        MONEY_LARGE: {x: 190, y: 20}, // 大 ¥
        MONEY_SMALL2: {x: 96, y: 40}, // 小 $
        MONEY_LARGE2: {x: 329, y: 20}, // 大 $
        TEXT_SPRITE: {x:845, y:40}, //0~9
        TREX: {x: 16, y: 928}, // 人物
        RESTART: {x: 990, y: 788}, // 重新開始
        GAMEOVER: {x:4, y:714},
        MOON: {x:901, y:1023}, //飛機
        STARBG: {x:0, y:331},  //背景星星
    },
  };

  // 游戏中用到的键盘码
  Runner.keyCodes = {
    JUMP: { 38: 1, 32: 1 }, // Up, Space
    DUCK: { 40: 1 }, // Down
    RESTART: { 13: 1 }, // Enter
  };

  // 游戏中用到的事件
  Runner.events = {
    LOAD: "load",
    KEYDOWN: "keydown",
    KEYUP: "keyup",
    MOUSEDOWN: 'mousedown',
    MOUSEUP: 'mouseup',
    RESIZE: 'resize',
    TOUCHEND: 'touchend',
    TOUCHSTART: 'touchstart',
    ANIMATION_END: "webkitAnimationEnd",
    BLUR: "blur",
    FOCUS: "focus",
  };
  Runner.prototype = {
    init: function () {      
      this.containerEl = document.createElement("div");
      this.containerEl.className = Runner.classes.CONTAINER;
      this.canvas = createCanvas(
        this.containerEl,
        this.dimensions.WIDTH,
        this.dimensions.HEIGHT,
        Runner.classes.PLAYER
      );
      this.ctx = this.canvas.getContext("2d");
      this.ctx.fillStyle = "#f7f7f7";
      this.ctx.fill();
      // console.log(this.canvas, this.spriteDef, this.dimensions, this.config.GAP_COEFFICIENT)
      this.horizon = new Horizon(this.canvas, this.spriteDef, this.dimensions, this.config.GAP_COEFFICIENT);
      this.outerContainerEl.appendChild(this.containerEl);
      // 更新 canvas
      this.update();
      // 監聽滑鼠事件
      this.startListening();
      // 計分器
      this.distanceMeter = new DistanceMeter(this.canvas, this.spriteDef.TEXT_SPRITE, this.dimensions.WIDTH);
      // 載入人物
      this.tRex = new Trex(this.canvas, this.spriteDef.TREX);
    },
    loadImages: function () {
      this.spriteDef = Runner.spriteDefinition.LDPI;
      Runner.imageSprite = document.getElementById("offline-resources-1x");
      if (Runner.imageSprite) {
        this.init();
      } else {
        Runner.imageSprite.addEventListener(
          Runner.events.LOAD,
          this.init.bind(this)
        );
      }
    },
    update: function (){
      this.updatePending = false; //等待更新
      let now = getTimeStamp();
      let deltaTime = now - (this.time || now);
      this.time = now;
      if(this.playing){
        // 下一張圖先清空出來
        this.clearCanvas();
        this.horizon.update(deltaTime, this.currentSpeed); //觀眾席
        if(this.tRex.jumping){
          this.tRex.updateJump(deltaTime);
        }
        this.runningTime += deltaTime;
        let hasObstacles = this.runningTime > this.config.CLEAR_TIME; //過三秒後
        if(this.tRex.jumpCount == 1){
          this.playIntro(); //開場動畫
        }
        deltaTime = !this.activated ? 0 : deltaTime; //動畫中 deltaTime = 0
        this.horizon.update(deltaTime, this.currentSpeed, hasObstacles); //障礙物
        // 碰撞檢測 ctx邊框 debug
        // let collision = hasObstacles && checkForCollision(this.horizon.obstacles[0], this.tRex, this.ctx);
        let collision = hasObstacles && checkForCollision(this.horizon.obstacles[0], this.tRex);
        if(!collision){
          if(this.currentSpeed < this.config.MAX_SPEED){
            this.currentSpeed += this.config.ACCELERATION; //隨著時間增加速度
          }
          this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame; //距離轉分數    
          this.tRex.update(deltaTime); // 人物更新
        }else{
          this.gameOver();
        }
        this.distanceMeter.update(deltaTime, Math.ceil(this.distanceRan)); //計分        
        // 進行下次更新
        this.scheduleNextUpdate();
      }
    },
    clearCanvas: function(){
      this.ctx.clearRect(0, 0, this.dimensions.WIDTH, this.dimensions.HEIGHT);
    },
    scheduleNextUpdate: function(){
      if(!this.updatePending){
        this.updatePending = true;
        this.raqId = requestAnimationFrame(this.update.bind(this)); //請求動畫幀
      }
    },
    startListening: function(){
      if (Com.browserRedirect()) {
        // console.log("this.touchController", this.touchController)
        // console.log("this.containerEl", this.containerEl)
        // Mobile only touch devices.
        // this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
        // this.touchController.addEventListener(Runner.events.TOUCHEND, this);
        // this.containerEl.addEventListener(Runner.events.TOUCHSTART, this);
        touchPad.addEventListener(Runner.events.TOUCHSTART, this);
        btnStart.addEventListener(Runner.events.TOUCHSTART,this);
        btnRestart.addEventListener(Runner.events.TOUCHSTART,this);
        btnAgain.addEventListener(Runner.events.TOUCHSTART,this);
        btnExit.addEventListener(Runner.events.TOUCHSTART,this);
      } else {
          // Mouse.
          touchPad.addEventListener(Runner.events.MOUSEDOWN, this);
          // touchPad.addEventListener(Runner.events.MOUSEUP, this);
          btnStart.addEventListener(Runner.events.MOUSEDOWN,this);
          // btnStart.addEventListener(Runner.events.MOUSEUP,this);
          btnRestart.addEventListener(Runner.events.MOUSEDOWN,this);
          // btnRestart.addEventListener(Runner.events.MOUSEUP,this);
          btnAgain.addEventListener(Runner.events.MOUSEDOWN,this);
          // btnAgain.addEventListener(Runner.events.MOUSEUP,this);
          btnExit.addEventListener(Runner.events.MOUSEDOWN,this);
          // btnExit.addEventListener(Runner.events.MOUSEUP,this);
      } 
    },
    // 事件監聽，瀏覽器預設調用方法
    handleEvent: function(e){
      return (function (eType, events){
        switch (eType) {
          case events.KEYDOWN:
          case events.TOUCHSTART:
          case events.MOUSEDOWN:
            this.onKeyDown(e);
            break;
          // case events.KEYUP:
          // case events.TOUCHEND:
          // case events.MOUSEUP:
          //   this.onKeyUp(e);
          //   break;
          default:
            break; 
        }
      }.bind(this))(e.type, Runner.events);
    },
    onKeyDown: function(e){
      // console.log("key....", e)
      Com.browserRedirect() ? window.scrollTo(0, top-140) : window.scrollTo(0, top+150);        
      // if(((e.target == btnStart || e.target == touchPad )&& account.length > 3 )){
      if(((e.target == btnStart || e.target == touchPad ))){
        btnStart.style.display = 'none';
        bg.style.display = 'none';
        touchPad.style.display = 'block';
        if (e.type == Runner.events.TOUCHSTART || e.type == Runner.events.MOUSEDOWN) {
          e.preventDefault();            
          if (!this.playing) {
            this.restart(); 
            this.setPlayStatus(true);
            this.update();
          }
          // 開始跳
          if(!this.tRex.jumping){
            this.tRex.startJump(this.currentSpeed);
          }
        }    
      }else if(e.target == btnAgain || e.target == btnExit){
        if(this.crashed && this.paused){
          if (e.type == Runner.events.TOUCHSTART || e.type == Runner.events.MOUSEDOWN) {
            e.preventDefault();                
            btnStart.style.display = 'block';
            btnRestart.style.display = 'none';
            btnAgain.style.display = 'none';
            // btnService.style.display = 'none';                 
          }
        }else{
          // 離開
          if(this.playing){
            this.gameOver();
          }
        }
      }else if(e.target == btnRestart){
        console.log("btn-restart...")
      }
    },
    // 遊戲狀態
    setPlayStatus: function (isPlaying) {
      this.playing = isPlaying;
    },
    // 開場
    playIntro: function (){
      if (!this.activated && !this.crashed) {  
        this.startGame(this);
        this.setPlayStatus(true); // 遊戲開始
        this.activated = true; // 彩蛋開啟
      }
    },
    startGame: function() {
      // this.playingIntro = false; //開場動畫結束
      // this.containerEl.style.webkitAnimation = "";
      window.addEventListener(Runner.events.BLUR, this.onVisibilityChange.bind(this));
      window.addEventListener(Runner.events.FOCUS, this.onVisibilityChange.bind(this));
    },
    onVisibilityChange: function(e){
      if(document.hidden || document.webkitHidden || e.type == 'blur' || document.visibilityState != 'visible'){
        this.stop();
        // this.gameOver();
        window.removeEventListener(Runner.events.BLUR, this.gameOver);
        window.removeEventListener(Runner.events.FOCUS, this.gameOver);
      } else if (!this.crashed){
        this.play();
      }
    },
    play: function(){
      if (!this.crashed) {
        this.setPlayStatus(true);
        this.paused = false;
        this.time = getTimeStamp();
        this.update();
      }
    },
    stop: function(){
      this.setPlayStatus(false);
      this.paused = true;
      cancelAnimationFrame(this.raqId);
      this.raqId = 0;
    },
    gameOver: function(){      
      this.stop();
      this.crashed = true; //碰撞
      this.distanceMeter.achievement = false; //分數動畫關閉
      // 更新人物碰撞狀態
      this.tRex.update(100, Trex.status.CRASHED);
      // 繪製結束畫面
      if(!this.gameOverPanel){
        this.gameOverPanel = new GameOverPanel(this.canvas, this.spriteDef.GAMEOVER, this.spriteDef.RESTART, this.dimensions);
      }else{
        this.gameOverPanel.draw();
      }
      this.time = getTimeStamp(); //重置時間
    },
    // 遊戲是否進行中
    isRunning: function(){
      return !!this.raqId;
    },
    restart: function() {      
      this.raqId = 0;
      this.runningTime = 0;                  // 重置游戏运行时间
      this.setPlayStatus(true);              // 游戏重置为进行状态
      this.paused = false;                   // 游戏没有暂停
      this.crashed = false;                  // 小恐龙没有撞到障碍物
      this.distanceRan = 0;                  // 重置游戏移动距离（分数）
      this.currentSpeed = this.config.SPEED; // 重置游戏当前的速度
      this.time = getTimeStamp();            // 重置计时器
      // this.clearCanvas();                    // 清空画布
      this.distanceMeter.reset();            // 重置分数类
      this.horizon.reset();                  // 重置背景类
      this.tRex.reset();                     // 重置小恐龙类
      // this.invert(true);                     // 重置页面为没有进行颜色反转
      this.update();                         // 重置后更新游戏
      if (this.raqId) {
      }
    },
  };
  // -------------------------------------------------------
  function Horizon(canvas, spritePos, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.dimensions = dimensions;
    this.spritePos = spritePos;
    this.gapCoefficient = gapCoefficient; //間距係數
    this.obstacles = []; //存障礙物
    this.obstacleHistory = []; //存障礙物類型
    this.xPos = 0;
    this.yPos = 0;
    this.cloudFrequency = Cloud.config.CLOUD_FREQUENCY; //雲的頻率
    this.clouds = [];
    this.cloudSpeed = Cloud.config.BG_CLOUD_SPEED;   
    this.moon = []; 
    this.moonSpeed = Moon.config.BG_MOON_SPEED;
    this.init();
    this.draw();
  }
  Horizon.dimensions = {
      WIDTH: 795,
      HEIGHT: 360,
      YPOS: 220
  }
  Horizon.prototype = {
    init: function () {
      // 移動端 x 軸會跑掉
        // for (const d in Horizon.dimensions){
        //     if(Horizon.dimensions.hasOwnProperty(d)){ //檢查是否有屬性
        //         const elem = Horizon.dimensions[d]
        //         this.dimensions[d] = elem;
        //     }
        // }
        this.xPos = [0, Horizon.dimensions.WIDTH];
        // this.addCloud();
        this.addStar();
        // this.addMoon();
        this.yPos = Horizon.dimensions.YPOS;
        // console.log("d",this.dimensions )
    },
    draw: function () {     
      // image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight      
      // 第一張背景
      this.ctx.drawImage(Runner.imageSprite, this.spritePos.HORIZON.x, this.spritePos.HORIZON.y, this.dimensions.WIDTH,
          this.dimensions.HEIGHT, this.xPos[0], this.yPos, this.dimensions.WIDTH, this.dimensions.HEIGHT);
      // 第二張背景
      this.ctx.drawImage(Runner.imageSprite, this.spritePos.HORIZON.x, this.spritePos.HORIZON.y, this.dimensions.WIDTH,
        this.dimensions.HEIGHT, this.xPos[1], this.yPos, this.dimensions.WIDTH, this.dimensions.HEIGHT);       
    },
    /**
   * 更新地面的 x 坐标
   * @param {Number} pos 地面的位置
   * @param {Number} incre 移动距离
   */
    updateXPos: function(pos, incre) {
      let line1 = pos;
      let line2 = pos===0 ? 1: 0;
      this.xPos[line1] -= incre;
      this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;
      // console.log("this.xPos", this.xPos[line1], this.xPos[line2])   
      if(this.xPos[line1] <= -this.dimensions.WIDTH){ //重複一輪      
        this.xPos[line1] += this.dimensions.WIDTH * 2;
        // this.sourceXPos = this.spritePos.x;
      }
    },
    /**
   * 更新地面
   * @param {Number} deltaTime 间隔时间
   * @param {Number} speed 速度
   */
    update: function (deltaTime, speed, updateObstacle) {
      let incre = Math.floor(speed * (FPS/1000) * deltaTime);
      // console.log("incre", incre, speed, deltaTime)
      // console.log(this.xPos[0])
      if(this.xPos[0] <= 0){
        this.updateXPos(0, incre);
      }else{
        this.updateXPos(1, incre);
      }
      this.addStar();
      // this.updateMoon(deltaTime, speed);
      this.draw();
      // this.updateCloud(deltaTime, speed);
      // 開始三秒後
      // console.log(deltaTime, speed)
      if(updateObstacle){
        this.updateObstacles(deltaTime, speed);
      }
    },
    // 新增星星背景
    addStar: function(){
      this.ctx.drawImage(Runner.imageSprite, this.spritePos.STARBG.x, this.spritePos.STARBG.y, this.dimensions.WIDTH,
        this.dimensions.HEIGHT, 0, -20, this.dimensions.WIDTH, this.dimensions.HEIGHT);
    },
    // 新增月亮
    addMoon: function(){
      this.moon.push(new Moon(this.canvas, this.spritePos.MOON, this.dimensions.WIDTH))
    },
    updateMoon: function(deltaTime, speed){
      // let moonSpeed = Math.ceil(deltaTime * this.moonSpeed * speed / 1000); //無條件進位
      let numMoons = this.moon.length;
      if(numMoons){
        this.moon[numMoons-1].update(0.1);
        if(this.moon[numMoons-1].remove){
          this.addMoon();
        }
      }else{
        this.addMoon();
      }
    },
    // 新增雲朵
    addCloud: function(){
      // console.log(this.canvas, this.spritePos.CLOUD.x, this.dimensions.WIDTH)
      this.clouds.push(new Cloud(this.canvas, this.spritePos.CLOUD, this.dimensions.WIDTH))
    },
    updateCloud: function (deltaTime, speed){
      let cloudSpeed = Math.ceil(deltaTime * this.cloudSpeed * speed / 1000); //無條件進位
      let numClouds = this.clouds.length;
      if(numClouds){
        for(let i= numClouds-1; i>=0; i--){
          this.clouds[i].update(cloudSpeed);
        }
      let lastCloud = this.clouds[numClouds - 1];
      // 检查是否需要添加新的云朵
      // 添加云朵的条件：云朵数量少于最大数量、
      // 最后一个云朵后面的空间大于它的间隙、
      // 云朵出现频率符合要求
      if(numClouds < Cloud.config.MAX_CLOUDS && (this.dimensions.WIDTH - lastCloud.xPos) >
        lastCloud.cloudGap && this.cloudFrequency > Math.random()) {
           this.addCloud();
      }
      // 過濾 remove 屬性為 false 的雲
      this.clouds = this.clouds.filter(function (item) {    
        return !item.remove;
      })
      }else{
        this.addCloud();
      }
    },
    // 新增障礙物
    addNewObstacle: function (currentSpeed){
      let obstacleTypeIndex = getRandomNum(0, Obstacle.types.length - 1);
      let obstacleType = Obstacle.types[obstacleTypeIndex];     
      if(this.duplicateObstacleCheck(obstacleType.type) || currentSpeed < obstacleType.minSpeed){
        // 重複兩次在產生一次
        this.addNewObstacle(currentSpeed);
      }else{
        let obstacleSpritePos = this.spritePos[obstacleType.type];
        // 存障礙物
        this.obstacles.push(new Obstacle(this.canvas, obstacleType, obstacleSpritePos, this.dimensions, this.gapCoefficient,
          currentSpeed, obstacleType.width));
        this.obstacleHistory.unshift(obstacleType.type); //存障礙物類型
        if(this.obstacleHistory.length > 1){
          // 情除舊的兩個
          this.obstacleHistory.splice(Runner.config.MAX_OBSTACLE_DUPLICATION);
        } 
      }

    },
    duplicateObstacleCheck: function(nextObstacleType){
      let duplicateCount = 0; //重複次數
      // console.log("nextObstacleType", nextObstacleType, this.obstacleHistory)
      for(let i = 0; i<this.obstacleHistory.length; i++){
        duplicateCount = this.obstacleHistory[i] == nextObstacleType ? duplicateCount+1 : 0;
      }
      return duplicateCount >= Runner.config.MAX_OBSTACLE_DUPLICATION; //重複兩次以上為true
    },
    updateObstacles: function(deltaTime, currentSpeed){
      // console.log("updateObstacles", deltaTime, currentSpeed, this.obstacles)
      let updateObstacles = this.obstacles;
      // let updateObstacles = this.obstacles.slice(0); //copy array
      // console.log(updateObstacles)
      for(let i =0; i< this.obstacles.length; i++){
        let obstacle = this.obstacles[i];
        // console.log("obstacle", obstacle);
        obstacle.update(deltaTime, currentSpeed);
        if(obstacle.remove){
          updateObstacles.shift(); //移除第一筆
          // console.log("刪除.....")
        }
      }
      // 畫面只產生一個障礙物
      if(!updateObstacles.length > 0){
        this.addNewObstacle(currentSpeed);
      }
    },
    reset: function(){
      this.obstacles = [];
      this.xPos[0] = 0;
      this.xPos[1] = Horizon.dimensions.WIDTH;
    }
  };
  // -------------------------------------------------------
  /**
   * 小恐龙类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的坐标
   */
  function Trex(canvas, spritePos){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.spritePos = spritePos;
    this.xPos = 0;
    this.yPos = 0;
    this.groundYPos = 0; //人物 y 座標
    this.currentFrame = 0; //當前動畫針
    this.currentAnimFrames = []; //目前動畫針在sprite中的x座標
    this.timer = 0; 
    this.msPerFrame = 1000 / FPS;
    this.status = Trex.status.WAITING; //目前狀態
    this.config = Trex.config;
    this.jumping = false; 
    this.jumpVelocity = 0; //跳躍速度
    this.reachedMinHeight = false; //是否達到最低高度
    this.speedDrop = false; //是否加速下降
    this.jumpCount = 0;
    this.jumpspotX = 0; //跳躍點 x 座標
    this.init();
  }
  Trex.config = {
    GRAVITY: 0.43,               // 引力 0.6
    WIDTH: 60,                  // 站立时的宽度
    HEIGHT: 82,
    // WIDTH_DUCK: 59,             // 俯身时的宽度
    HEIGHT_DUCK: 25,
    MAX_JUMP_HEIGHT: 30,        // 最大跳跃高度
    MIN_JUMP_HEIGHT: 30,        // 最小跳跃高度
    SPRITE_WIDTH: 262,          // 站立的小恐龙在雪碧图中的总宽度
    DROP_VELOCITY: -5,          // 下落的速度
    INITIAL_JUMP_VELOCITY: -10, // 初始跳跃速度
    SPEED_DROP_COEFFICIENT: 3,  // 下落时的加速系数（越大下落的越快）
    INTRO_DURATION: 1500,       // 开场动画的时间
    START_X_POS: 50,            // 开场动画结束后，小恐龙在 canvas 上的 x 坐标
  };
  Trex.status = {
    CRASHED: 'CRASHED', // 撞到障碍物
    // DUCKING: 'DUCKING', // 正在闪避（俯身）
    JUMPING: 'JUMPING', // 正在跳
    RUNNING: 'RUNNING', // 正在奔跑
    WAITING: 'WAITING', // 正在等待（未开始游戏）
  };
  // 为不同的状态配置不同的动画帧
  Trex.animFrames = {
    WAITING: {
      frames: [0, 0],
      msPerFrame: 1000 / 3
    },
    RUNNING: {
      // frames: [0, 0],
      frames: [-2, 67, 144, 224, 295, 378],
      msPerFrame: 1000 / 18, //跑步速率
    },
    CRASHED: {
      frames: [454, 523, 600, 680, 751, 834],
      msPerFrame: 1000 / 35
    },
    JUMPING: {
      frames: [-2],
      msPerFrame: 1000 / 60
    },
    DUCKING: {
      frames: [88, 132],
      msPerFrame: 1000 / 8
    },
  };
  Trex.prototype = {
    init: function(){
      // 最低跳躍高度
      this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
      // console.log(Runner.defaultDimensions.HEIGHT, Runner.config.BOTTOM_PAD)
      // this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT - Runner.config.BOTTOM_PAD;
      this.groundYPos = 260;
      this.yPos = this.groundYPos;

      this.draw(0,0);
      this.update(0, Trex.status.WAITING);
    },
    draw: function(x, y){
      let sourceX = x + this.spritePos.x;
      let sourceY = y + this.spritePos.y;
      let sourceWidth = this.config.WIDTH;
      let sourceHeight = this.config.HEIGHT;
      let outputHeight = sourceHeight;
      this.ctx.drawImage(
        Runner.imageSprite,
        sourceX, sourceY,
        sourceWidth, sourceHeight,
        this.xPos, this.yPos,
        this.config.WIDTH, outputHeight
      );
      // this.ctx.globalAlpha = 1; //透明度
    },
    update: function(deltaTime, opt_status){
      this.timer += deltaTime;
      // 更新状态的参数
      if (opt_status) {
        this.status = opt_status;
        if(this.status !== 'CRASHED'){ 
          this.currentFrame = 0;
        }
        this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;   
        this.currentAnimFrames = Trex.animFrames[opt_status].frames;   
      }
      if (this.status == Trex.status.RUNNING){
        // 跑步動作
        if (this.timer >= this.msPerFrame) {     
          this.currentFrame = this.currentFrame == this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
          // 更新当前动画帧，如果处于最后一帧就更新为第一帧，否则更新为下一帧
          // 重置计时器
          this.timer = 0;
        }
      }
      this.draw(this.currentAnimFrames[this.currentFrame], 0);
    },
    startJump: function(speed){
      if(!this.jumping){
        this.update(0, Trex.status.JUMPING);
        // 根据游戏的速度调整跳跃的速度
        this.jumpVelocity = this.config.INITIAL_JUMP_VELOCITY - (speed / 10); 
        this.jumping = true;
        this.reachedMinHeight = false;
        this.speedDrop = false;
      }
    },
    updateJump: function(deltaTime){
      let msPerFrame = Trex.animFrames[this.status].msPerFrame; // 获取当前状态的帧率
      let framesElapsed = deltaTime / msPerFrame;
      // 加速下落
      if (this.speedDrop) { 
        this.yPos += Math.round(this.jumpVelocity * this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
      } else {
        this.yPos += Math.round(this.jumpVelocity * framesElapsed);
      }
      // 跳跃的速度受重力的影响，向上逐渐减小，然后反向
      this.jumpVelocity += this.config.GRAVITY * framesElapsed;
      // 达到了最低允许的跳跃高度
      if (this.yPos < this.minJumpHeight || this.speedDrop) {
        this.reachedMinHeight = true;
      }
      // 达到了最高允许的跳跃高度
      if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
        this.endJump(); // 结束跳跃
      }
      // 重新回到地面，跳跃完成
      if (this.yPos > this.groundYPos) {
        this.reset();     // 重置小恐龙的状态
        this.jumpCount++; // 跳跃次数加一
      }
    },
    endJump: function(){
      if (this.reachedMinHeight && this.jumpVelocity < this.config.DROP_VELOCITY) {
        this.jumpVelocity = this.config.DROP_VELOCITY; // 下落速度重置为默认
      }
    },
    reset: function(){
      this.yPos = this.groundYPos;
      this.jumpVelocity = 0;
      this.jumping = false;
      this.ducking = false;
      this.update(0, Trex.status.RUNNING);
      this.speedDrop = false;
      this.jumpCount = 0;
    }
  }
  // -------------------------------------------------------
  /**
   * 月亮
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的位置信息
   * @param {Number} containerWidth 容器的宽度
   */
  function Moon(canvas, spritePos, containerWidth){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.init();

  }
  Moon.config = {
    WIDTH: 200,
    HEIGHT: 200,
    BG_MOON_SPEED: 0.1,
  }
  Moon.prototype = {
    init: function(){
      this.draw()
    },
    draw: function(){
      this.ctx.save();
      let sourceWidth = Moon.config.WIDTH;
      let sourceHeight = Moon.config.HEIGHT;
      let outputWidth = sourceWidth;
      let outputHeight = sourceHeight;
      // console.log(this.spritePos.x, this.spritePos.y, sourceWidth,  sourceHeight,
      //   this.xPos, this.yPos, outputWidth, outputHeight )
      this.ctx.drawImage(Runner.imageSprite, this.spritePos.x, this.spritePos.y, sourceWidth,  sourceHeight,
        this.xPos, this.yPos, outputWidth, outputHeight )
      this.ctx.restore();
    },
    update: function(speed){
      if(!this.remove){
        this.xPos -= speed;
        this.draw();
        if(! this.isVisible()){
          this.remove = true; //刪除
        }
      }
    },
    isVisible: function(){
      return this.xPos + Moon.config.WIDTH > 0;
    }
  }
  // -------------------------------------------------------
  /**
   * 雲朵
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的位置信息
   * @param {Number} containerWidth 容器的宽度
   */
  function Cloud(canvas, spritePos, containerWidth){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.spritePos = spritePos;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    // 隨機產生雲朵
    this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP, Cloud.config.MAX_CLOUD_GAP);
    this.init();
  }
  Cloud.config = {
    WIDTH: 56,
    HEIGHT: 26,
    MIN_CLOUD_GAP: 100,   // 云之间的最小间隙
    MAX_CLOUD_GAP: 400,   // 云之间的最大间隙
    MIN_SKY_LEVEL: 46,    // 云的最小高度
    MAX_SKY_LEVEL: 0,    // 云的最大高度
    BG_CLOUD_SPEED: 0.2,  // 云的速度
    CLOUD_FREQUENCY: 0.4, // 云的频率
    MAX_CLOUDS: 6         // 云的最大数量
  };
  Cloud.prototype = {
    init: function(){
      // 隨機高度
      this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL, Cloud.config.MIN_SKY_LEVEL);
      this.draw();
    },
    draw: function(){
      this.ctx.save();
      let sourceWidth = Cloud.config.WIDTH;
      let sourceHeight = Cloud.config.HEIGHT;
      let outputWidth = sourceWidth;
      let outputHeight = sourceHeight;
      // console.log(this.xPos, this.yPos, outputWidth, outputHeight)
      this.ctx.drawImage(Runner.imageSprite, this.spritePos.x, this.spritePos.y, sourceWidth, sourceHeight,
        this.xPos, this.yPos, outputWidth, outputHeight);
      this.ctx.restore();
    },
    update: function(speed){
      if(!this.remove){
        this.xPos -= speed;
        this.draw();
        if(! this.isVisible()){
          this.remove = true; //刪除
        }
      }
    },
    // 雲是否移出canvas
    isVisible: function(){
      return this.xPos + Cloud.config.WIDTH > 0;
    }
  }
  // -------------------------------------------------------
  /**
   * 障碍物类
   * @param {HTMLCanvasElement} canvas 画布
   * @param {String} type 障碍物类型
   * @param {Object} spriteImgPos 在雪碧图中的位置
   * @param {Object} dimensions 画布尺寸
   * @param {Number} gapCoefficient 间隙系数
   * @param {Number} speed 速度
   * @param {Number} opt_xOffset x 坐标修正
   */
  function Obstacle(canvas, type, spriteImgPos, dimensions, gapCoefficient, speed, opt_xOffset){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.typeConfig = type;
    this.spritePos = spriteImgPos;
    this.gapCoefficient = gapCoefficient;
    this.dimensions = dimensions;
    // 每組障礙物數量隨機 1~3
    this.size = getRandomNum(1, Obstacle.MAX_OBSTACLE_LENGTH);
    // console.log("opt_xOffset", opt_xOffset)
    this.xPos = dimensions.WIDTH + (opt_xOffset || 0);
    this.yPos = 0;
    this.remove = false;
    this.gap = 0; //間距
    // this.speedOffset = 0; //速度修正
    this.currentSpeed = 0;
    this.timer = 0;
    this.collisionBoxes = this.typeConfig.collisionBoxes; //存碰撞盒子
    // this.collisionBoxes = []; //存碰撞盒子
    this.init(speed);
  }
  Obstacle.MAX_GAP_COEFFICIENT = 1.5; // 最大间隙系数
  Obstacle.MAX_OBSTACLE_LENGTH = 3;   // 每组障碍物的最大数量
  Obstacle.types = [{
    type: 'MONEY_SMALL',  // 小¥
    width: 30,
    height: 40,
    yPos: 300,             // 在 canvas 上的 y 坐标
    multipleSpeed: 4,
    minGap: 120,           // 最小间距
    minSpeed: 0,           // 最低速度
    collisionBoxes: [      // 碰撞盒子
      new CollisionBox(0, 7, 5, 27),
      new CollisionBox(4, 0, 6, 34),
      new CollisionBox(10, 4, 7, 14),
    ],
    }, 
    {
      type: 'MONEY_LARGE',  // 大¥
      width: 45,
      height: 60,
      yPos: 290,
      multipleSpeed: 5.5,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [      // 碰撞盒子
        new CollisionBox(0, 12, 7, 38),
        new CollisionBox(8, 0, 7, 49),
        new CollisionBox(13, 10, 10, 38),
      ],
    }, {
      type: 'MONEY_SMALL2',  // 小$
      width: 30,
      height: 40,
      yPos: 300,             // 在 canvas 上的 y 坐标
      multipleSpeed: 4,
      minGap: 120,           // 最小间距
      minSpeed: 0,           // 最低速度
      collisionBoxes: [      // 碰撞盒子
        new CollisionBox(0, 7, 5, 27),
        new CollisionBox(4, 0, 6, 34),
        new CollisionBox(10, 4, 7, 14),
      ],
    }, {
      type: 'MONEY_LARGE2',  // 大$
      width: 45,
      height: 60,
      yPos: 290,
      multipleSpeed: 6.5,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [      // 碰撞盒子
        new CollisionBox(0, 12, 7, 38),
        new CollisionBox(8, 0, 7, 49),
        new CollisionBox(13, 10, 10, 38),
      ],
    }, 
    {
      type: 'MOON',  // 飛機
      width: 160,
      height: 148,
      yPos: 170,
      multipleSpeed: 8,
      minGap: 120,
      minSpeed: 0,
      collisionBoxes: [      // 碰撞盒子 x,y,w,h
        new CollisionBox(50, 10, 10, 50),
        new CollisionBox(50, 60, 50, 10),
        new CollisionBox(100, 30, 50, 10),
      ],
    }, 
  ];
  Obstacle.prototype = {
    init: function(speed){
      // this.cloneCollisionBoxes();
      // 依速度產生 組合障礙物
      if(this.size > 1 && this.typeConfig.multipleSpeed >= speed) {
        this.size = 1; //幾個組合
      }else if(speed >= 4.8 && speed < 6 && this.typeConfig.multipleSpeed <= speed){
        this.size = 2;
      }else if(speed >= 6 && this.typeConfig.multipleSpeed <= speed){
        this.size = 2;
      }else{
        this.size = 1;
      }
      this.width = this.typeConfig.width * this.size;
      this.yPos = this.typeConfig.yPos;
      
      // 调整中间的碰撞盒子的大小
      //      ____        ______        ________
      //    _|   |-|    _|     |-|    _|       |-|
      //   | |<->| |   | |<--->| |   | |<----->| |
      //   | | 1 | |   | |  2  | |   | |   3   | |
      //   |_|___|_|   |_|_____|_|   |_|_______|_|
      //
      if (this.size > 1) {
        this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width - this.collisionBoxes[2].width;
        this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
      }
      this.draw();
      // 障碍物的间隙随游戏速度变化而改变
      this.gap = this.getGap(this.gapCoefficient, speed)
    },
    getGap: function(gapCoefficient, speed){
      let minGap = Math.round(this.width * speed + this.typeConfig.minGap * gapCoefficient);
      let maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
      return getRandomNum(minGap, maxGap);
    },
    draw: function(){
      let sourceWidth = this.typeConfig.width;
      let sourceHeight = this.typeConfig.height;
      let sourceX = this.spritePos.x;
      // 如果存在动画帧，则计算当前动画帧在雪碧图中的坐标
      if (this.currentFrame > 0) {
        sourceX += sourceWidth * this.currentFrame;
      }
      this.ctx.drawImage(Runner.imageSprite, sourceX, this.spritePos.y, sourceWidth * this.size,
        sourceHeight, this.xPos, this.yPos, this.typeConfig.width * this.size, this.typeConfig.height);
    },
    update: function(deltaTime, speed){
      if(!this.remove){
        // 修正速度
        // if(this.typeConfig.speedOffset){
        //   speed += this.speedOffset;
        // }
        this.xPos -= Math.floor((speed * FPS/1000) * Math.round(deltaTime));

        // console.log("xPos", this.xPos)
        this.draw();
        if(!this.isVisible()){
          this.remove = true;
        }
      }
    },
    isVisible: function(){
      return this.xPos + this.width > 0;
    },
    cloneCollisionBoxes: function(){
      // let collisionBoxes = this.typeConfig.collisionBoxes;
      // console.log("collisionBoxes", collisionBoxes)
      // for (let i = 0; i < collisionBoxes.length; i++){
      //   this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x, collisionBoxes[i].y,
      //     collisionBoxes[i].width, collisionBoxes[i].height); 
      // }
      // console.log(this.collisionBoxes)
    },
  }
  // -------------------------------------------------------
  /**
   * 记录移动的距离（分数等于移动距离）
   * @param {HTMLCanvasElement} canvas 画布
   * @param {Object} spritePos 图片在雪碧图中的位置
   * @param {Number} canvasWidth 画布的宽度
   */
  function DistanceMeter(canvas, spritePos, canvasWidth){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    // this.ctx.font = "20px Arial";
    // this.ctx.fillStyle = "black";
    this.config = DistanceMeter.config;
    this.spritePos = spritePos;
    this.x = 0;
    this.y = 5;
    this.maxScore = 0; //分數上限
    this.digits = []; //分數每一位數字
    this.achievement = false; //閃爍特效
    this.defaultString = ''; //預設 00000
    this.flashTimer = 0; //動畫計時器
    this.flashIterations = 0; //特效次數
    this.maxScoreUnits = this.config.MAX_DISTANCE_UNITS; //分數最大位數
    this.init(canvasWidth);
  }
  DistanceMeter.config = {
    MAX_DISTANCE_UNITS: 5,          // 分数的最大位数
    ACHIEVEMENT_DISTANCE: 100,      // 每 100 米触发一次闪动特效
    COEFFICIENT: 0.025,             // 将像素距离转换为比例单位的系数
    FLASH_DURATION: 1000 / 4,       // 一闪的时间（一次闪动分别两闪：从有到无，从无到有）
    FLASH_ITERATIONS: 3,            // 闪动的次数
  };
  DistanceMeter.dimensions = {
    WIDTH: 25,
    HEIGHT: 40,
    DEST_WIDTH: 12, // 加上间隔后每个数字的宽度
  };
  DistanceMeter.prototype = {
    init: function(width){
      let maxDistanceStr =''; //最大分數
      this.calcXPos(width);
      for(let i = 0; i<this.maxScoreUnits; i++){
        this.draw(i, 0);
        this.defaultString += '0';
        maxDistanceStr += '9';
      }
      this.maxScore = parseInt(maxDistanceStr);
    },
    // 計算x座標
    calcXPos: function(canvasWidth){
      this.x = (canvasWidth/2) - (DistanceMeter.dimensions.DEST_WIDTH * (this.maxScoreUnits + 1));
    },
    /**
     * 将分数绘制到 canvas 上
     * @param {Number} digitPos 数字在分数中的位置
     * @param {Number} value 数字的具体值（0-9）
     * @param {Boolean} opt_highScore 是否显示最高分
     */
    draw: function(digitPos, value, opt_highScore){
      let sourceX = this.spritePos.x + DistanceMeter.dimensions.WIDTH * value; //切割位置 x, y
      let sourceY = this.spritePos.y + 0;
      let sourceWidth = DistanceMeter.dimensions.WIDTH;
      let sourceHeight = DistanceMeter.dimensions.HEIGHT;
      // console.log(digitPos, DistanceMeter.dimensions.WIDTH)
      let targetX = digitPos * DistanceMeter.dimensions.WIDTH; //畫布位置 x, y
      let targetY = this.y;
      let targetWidth = DistanceMeter.dimensions.WIDTH;
      let targetHeight = DistanceMeter.dimensions.HEIGHT;
      // console.log("targetX",targetX, targetY )
      this.ctx.save();
      this.ctx.translate(this.x, this.y)
      // image, x, y, width, height
      // image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight
      this.ctx.drawImage(Runner.imageSprite, sourceX, sourceY, sourceWidth, sourceHeight,
          targetX, targetY, targetWidth, targetHeight);

      this.ctx.restore();
    },
    /**
     * 将游戏移动的像素距离转换为真实的距离
     * @param {Number} distance 游戏移动的像素距离
     */
    getActualDistance: function(distance){
      return distance ? Math.round(distance * this.config.COEFFICIENT) : 0;
    },
    update: function(deltaTime, distance){
      // console.log(deltaTime, distance)
      let paint = true; //顯示分數
      if(!this.achievement){
        let achievement = false;
        distance = this.getActualDistance(distance);
        totalNum.innerHTML = distance; //pop 分數
        if(distance === 100){     
//           initHd(id, 1);
          achievement = true;
        }else if(distance === 200){
//           initHd(id, 2);
          achievement = true;
        }else if(distance === 300){   
//           initHd(id, 3);
          achievement = true;
        }else if(distance === 600){   
//           initHd(id, 4);
          achievement = true;
        }
        if(achievement){
          this.achievement = true;
          this.flashTimer = 0;
        }       
        if(distance > 0){
          this.digits = (this.defaultString + distance).substr(-this.maxScoreUnits); //取最後五位數
        }else{
          this.digits = this.defaultString;
        }
      }else{
        if(this.flashIterations <= this.config.FLASH_ITERATIONS){
          this.flashTimer += deltaTime;
          // 閃爍不更新分數
          if(this.flashTimer < this.config.FLASH_DURATION){ //第一次
            paint = false;
          }else if(this.flashTimer > this.config.FLASH_DURATION * 2){ //第二次
            this.flashTimer = 0;
            this.flashIterations++;
          }
        }else{
          // 閃爍結束
          this.achievement = false;
          this.flashIterations = 0;
          this.flashTimer = 0;
        }
      }
      if(paint){
        for(let i=0; i<this.digits.length;i++){
          this.draw(i, this.digits[i]);
        }
      }
    },
    reset: function(){
      this.update(0); //更新分數
      this.achievement = false;
    }
  }
  // -------------------------------------------------------
  /**
   * 检测盒子是否碰撞
   * @param {Object} obstacle 障碍物
   * @param {Object} tRex 小恐龙
   * @param {HTMLCanvasContext} opt_canvasCtx 画布上下文
   */
  function checkForCollision(obstacle, tRex, opt_canvasCtx){
    let tRexBox = new CollisionBox(tRex.xPos + 1, tRex.yPos + 1, tRex.config.WIDTH -2, tRex.config.HEIGHT -2); //人物最外層碰撞盒子
    let obstacleBox = new CollisionBox(obstacle.xPos + 1, obstacle.yPos + 1, 
      obstacle.typeConfig.width * obstacle.size - 2, obstacle.typeConfig.height - 2); //障礙物最外層碰撞盒子
    // 繪製測試框
    if(opt_canvasCtx){
      drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
    }
    // 檢查最外層是否碰撞
    if(boxCompare(tRexBox, obstacleBox)){
      let collisionBoxes = obstacle.collisionBoxes;
      let tRexCollisionBoxes = tRex.jumping ? Trex.collisionBoxes.JUMPING : Trex.collisionBoxes.RUNNING;
      // 檢查內部是否碰撞
      for(let i = 0; i<tRexCollisionBoxes.length; i++){
        for(let j = 0; j < collisionBoxes.length; j++){
          let adjTrexBox = createAdjustedCollisionBox(tRexCollisionBoxes[i], tRexBox);
          let adjObstacleBox = createAdjustedCollisionBox(collisionBoxes[j], obstacleBox);
          let crashed = boxCompare(adjTrexBox, adjObstacleBox);
          // console.log(adjTrexBox, adjObstacleBox, crashed)
          if(opt_canvasCtx){
            drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
          }
          if(crashed){
            return [adjTrexBox, adjObstacleBox];
          }
        }
      }
    }
  }
  // -------------------------------------------------------
  /**
   * 游戏结束面板类
   * @param {!HTMLCanvasElement} 画布元素
   * @param {Object} textImgPos 文字 "Game Over" 在雪碧图中的位置
   * @param {Object} restartImgPos 重置按钮在雪碧图中的位置
   * @param {!Object} dimensions 游戏画布的尺寸
   */
  function GameOverPanel(canvas, textImgPos, restartImgPos, dimensions){
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.canvasDimensions = dimensions;
    this.textImgPos = textImgPos;
    this.restartImgPos = restartImgPos;
    this.draw();
  }
  // 配置参数
  GameOverPanel.dimensions = {
    TEXT_X: 0,          // 文字 "Game Over" 的 x 坐标
    TEXT_Y: 0,
    TEXT_WIDTH: 529,    // 文字 "Game Over" 的宽度
    TEXT_HEIGHT: 194,
    RESTART_WIDTH: 146,  // 重置按钮的宽度
    RESTART_HEIGHT: 120,
  };
  GameOverPanel.prototype = {
    draw: function() {
      let dimensions = GameOverPanel.dimensions;
      let centerX = this.canvasDimensions.WIDTH / 2;
      // 文字 "Game Over"
      let textSourceX = dimensions.TEXT_X;
      let textSourceY = dimensions.TEXT_Y;
      let textSourceWidth = dimensions.TEXT_WIDTH;
      let textSourceHeight = dimensions.TEXT_HEIGHT;
      let textTargetX = Math.round(centerX - ((textSourceWidth*scale) / 2));
      let textTargetY = Math.round(this.canvasDimensions.HEIGHT / 4);
      let textTargetWidth = dimensions.TEXT_WIDTH;
      let textTargetHeight = dimensions.TEXT_HEIGHT;
      textSourceX += this.textImgPos.x;
      textSourceY += this.textImgPos.y;    
      touchPad.style.display = 'none'; 
      // 遮罩
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, Runner.defaultDimensions.WIDTH, Runner.defaultDimensions.HEIGHT);
      // 文字 "Game over"
      this.ctx.drawImage(Runner.imageSprite,
        textSourceX, textSourceY, textSourceWidth, textSourceHeight,
        textTargetX, textTargetY, textTargetWidth*scale, textTargetHeight*scale);
      setTimeout(()=>{
        popMsg.style.zIndex = 100;
        setTimeout(()=>{
          popMsg.style.zIndex = 0;
          bg.style.display = 'block';
          btnAgain.style.display = 'block';
          // btnService.style.display = 'block';
        },3000)
      },1000);
    }
  };
  // -------------------------------------------------------
   /**
   * 调整碰撞盒子
   * @param {!CollisionBox} box 原始的盒子
   * @param {!CollisionBox} adjustment 要调整成的盒子
   * @return {CollisionBox} 被调整的盒子对象
   */
  function createAdjustedCollisionBox(box, adjustment){
    return new CollisionBox(box.x + adjustment.x, box.y + adjustment.y, box.width, box.height);
  }
  /**
   * 绘制碰撞盒子的边框 debug用
   * @param {HTMLCanvasContext} canvasCtx canvas 上下文
   * @param {CollisionBox} tRexBox 小恐龙的碰撞盒子
   * @param {CollisionBox} obstacleBox 障碍物的碰撞盒子
   */
  function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox){
    canvasCtx.save();
    canvasCtx.strokeStyle = '#f00';
    canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);
    canvasCtx.strokeStyle = '#0f0';
    canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y, obstacleBox.width, obstacleBox.height);
    canvasCtx.restore();
  }
  /**
   * 比较两个矩形是否相交
   * @param {CollisionBox} tRexBox 小恐龙的碰撞盒子
   * @param {CollisionBox} obstacleBox 障碍物的碰撞盒子
   */
  function boxCompare(tRexBox, obstacleBox) {
    let crashed = false;
    // 两个矩形相交
    if (tRexBox.x < obstacleBox.x + obstacleBox.width &&
        tRexBox.x + tRexBox.width > obstacleBox.x &&
        tRexBox.y < obstacleBox.y + obstacleBox.height &&
        tRexBox.height + tRexBox.y > obstacleBox.y) {
      crashed = true;
    }
    return crashed;
  };
  /**
   * 用于生成碰撞盒子
   * @param {Number} x X 坐标
   * @param {Number} y Y坐标
   * @param {Number} w 宽度
   * @param {Number} h 高度
   */
  function CollisionBox(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  };
  // 小恐龙的碰撞盒子
  Trex.collisionBoxes = {
    DUCKING: [
      new CollisionBox(1, 18, 55, 25)
    ],
    RUNNING: [
      new CollisionBox(60, 5, 5, 30), //x,y,w,h
      new CollisionBox(50, 35, 5, 20),
      new CollisionBox(60, 55, 5, 20),
    ],
    JUMPING: [
      new CollisionBox(15, 0, 48, 80),
    ]
  };
  /**
   * 获取 [min, max] 之间的随机数
   * @param {Number} min 最小值
   * @param {Number} max 最大值
   * @return {Number}
   */
  function getRandomNum(min, max){
    return Math.floor(Math.random() * (max - min +1)) + min;
  }
  // 時間戳
  function getTimeStamp(){
    return performance.now();
  }
  function createCanvas(container, width, height, opt_className) {
    let canvas = document.createElement("canvas");
    canvas.className = opt_className
      ? opt_className + " " + Runner.classes.CANVAS
      : Runner.classes.CANVAS;
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    return canvas;
  }
})();
const onDocumentLoad = () => {
  new Runner(".interstitial-wrapper");
};
document.addEventListener("DOMContentLoaded", onDocumentLoad);
