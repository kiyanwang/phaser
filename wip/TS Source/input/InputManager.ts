/// <reference path="../_definitions.ts" />

/**
* Phaser - InputManager
*
* A game specific Input manager that looks after the mouse, keyboard and touch objects.
* This is updated by the core game loop.
*/

module Phaser {

    export class InputManager {

        constructor(game: Game) {

            this.game = game;

            this.mousePointer = new Pointer(this.game, 0);
            this.pointer1 = new Pointer(this.game, 1);
            this.pointer2 = new Pointer(this.game, 2);

            this.mouse = new Mouse(this.game);
            this.keyboard = new Keyboard(this.game);
            this.touch = new Touch(this.game);
            this.mspointer = new MSPointer(this.game);
            //this.gestures = new Gestures(this.game);

            this.onDown = new Phaser.Signal();
            this.onUp = new Phaser.Signal();
            this.onTap = new Phaser.Signal();
            this.onHold = new Phaser.Signal();

            this.scale = new Vec2(1, 1);
            this.speed = new Vec2;
            this.position = new Vec2;
            this._oldPosition = new Vec2;
            this.circle = new Circle(0, 0, 44);

            this.activePointer = this.mousePointer;
            this.currentPointers = 0;

            this.hitCanvas = <HTMLCanvasElement> document.createElement('canvas');
            this.hitCanvas.width = 1;
            this.hitCanvas.height = 1;
            this.hitContext = this.hitCanvas.getContext('2d');

        }

        /**
         * Local reference to game.
         */
        public game: Phaser.Game;

        /**
         * How often should the input pointers be checked for updates?
         * A value of 0 means every single frame (60fps), a value of 1 means every other frame (30fps) and so on.
         * @type {number}
         */
        public pollRate: number = 0;

        private _pollCounter: number = 0;

        /**
         * A 1x1 sized canvas used for pixel-perfect checks
         * @type {HTMLCanvasElement}
         */
        public hitCanvas: HTMLCanvasElement;

        /**
         * The context of the 1x1 pixel check canvas
         * @type {CanvasRenderingContext2D}
         */
        public hitContext: CanvasRenderingContext2D;

        /**
        * A vector object representing the previous position of the Pointer.
        * @property vector
        * @type {Vec2}
        **/
        private _oldPosition: Vec2 = null;

        /**
        * X coordinate of the most recent Pointer event
        * @type {Number}
        * @private
        */
        private _x: number = 0;

        /**
        * X coordinate of the most recent Pointer event
        * @type {Number}
        * @private
        */
        private _y: number = 0;

        /**
        * You can disable all Input by setting Input.disabled = true. While set all new input related events will be ignored.
        * If you need to disable just one type of input, for example mouse, use Input.mouse.disabled = true instead
        * @type {bool}
        */
        public disabled: bool = false;

        /**
         * Controls the expected behaviour when using a mouse and touch together on a multi-input device
         */
        public multiInputOverride: number = InputManager.MOUSE_TOUCH_COMBINE;

        /**
        * Static defining the behaviour expected on a multi-input device system.
        * With this setting when the mouse is used it updates the Input.x/y globals regardless if another pointer is active or not
        */
        public static MOUSE_OVERRIDES_TOUCH: number = 0;

        /**
        * Static defining the behaviour expected on a multi-input device system.
        * With this setting when the mouse is used it only updates the Input.x/y globals if no other pointer is active
        */
        public static TOUCH_OVERRIDES_MOUSE: number = 1;

        /**
        * Static defining the behaviour expected on a multi-input device system.
        * With this setting when the mouse is used it updates the Input.x/y globals at the same time as any active Pointer objects might
        */
        public static MOUSE_TOUCH_COMBINE: number = 2;

        /**
        * The camera being used for mouse and touch based pointers to calculate their world coordinates.
        * This is only ever the camera set by the most recently active Pointer.
        * If you need to know exactly which camera a specific Pointer is over then see Pointer.camera instead.
        * @property camera
        * @type {Camera}
        **/
        public get camera(): Camera {
            return this.activePointer.camera;
        }

        /**
        * Phaser.Mouse handler
        * @type {Mouse}
        */
        public mouse: Mouse;

        /**
        * Phaser.Keyboard handler
        * @type {Keyboard}
        */
        public keyboard: Keyboard;

        /**
        * Phaser.Touch handler
        * @type {Touch}
        */
        public touch: Touch;

        /**
        * Phaser.MSPointer handler
        * @type {MSPointer}
        */
        public mspointer: MSPointer;

        /**
        * Phaser.Gestures handler
        * @type {Gestures}
        */
        //public gestures: Gestures;

        /**
        * A vector object representing the current position of the Pointer.
        * @property vector
        * @type {Vec2}
        **/
        public position: Vec2 = null;

        /**
        * A vector object representing the speed of the Pointer. Only really useful in single Pointer games,
        * otherwise see the Pointer objects directly.
        * @property vector
        * @type {Vec2}
        **/
        public speed: Vec2 = null;

        /**
        * A Circle object centered on the x/y screen coordinates of the Input.
        * Default size of 44px (Apples recommended "finger tip" size) but can be changed to anything
        * @property circle
        * @type {Circle}
        **/
        public circle: Circle = null;

        /**
         * The scale by which all input coordinates are multiplied, calculated by the StageScaleMode.
         * In an un-scaled game the values will be x: 1 and y: 1.
         * @type {Vec2}
         */
        public scale: Vec2 = null;

        /**
        * The maximum number of Pointers allowed to be active at any one time.
        * For lots of games it's useful to set this to 1
        * @type {Number}
        */
        public maxPointers: number = 10;

        /**
        * The current number of active Pointers.
        * @type {Number}
        */
        public currentPointers: number = 0;

        /**
        * A Signal dispatched when a mouse/Pointer object is pressed
        * @type {Phaser.Signal}
        */
        public onDown: Phaser.Signal;

        /**
        * A Signal dispatched when a mouse/Pointer object is released
        * @type {Phaser.Signal}
        */
        public onUp: Phaser.Signal;

        /**
        * A Signal dispatched when a Pointer object (including the mouse) is tapped: pressed and released quickly.
        * The signal sends 2 parameters. The Pointer that caused it and a bool depending if the tap was a single tap or a double tap.
        * @type {Phaser.Signal}
        */
        public onTap: Phaser.Signal;

        /**
        * A Signal dispatched when a Pointer object (including the mouse) is held down
        * @type {Phaser.Signal}
        */
        public onHold: Phaser.Signal;

        /**
        * The number of milliseconds that the Pointer has to be pressed down and then released to be considered a tap or click
        * @property tapRate
        * @type {Number}
        **/
        public tapRate: number = 200;

        /**
        * The number of milliseconds between taps of the same Pointer for it to be considered a double tap / click
        * @property doubleTapRate
        * @type {Number}
        **/
        public doubleTapRate: number = 300;

        /**
        * The number of milliseconds that the Pointer has to be pressed down for it to fire a onHold event
        * @property holdRate
        * @type {Number}
        **/
        public holdRate: number = 2000;

        /**
        * The number of milliseconds below which the Pointer is considered justPressed
        * @property justPressedRate
        * @type {Number}
        **/
        public justPressedRate: number = 200;

        /**
        * The number of milliseconds below which the Pointer is considered justReleased
        * @property justReleasedRate
        * @type {Number}
        **/
        public justReleasedRate: number = 200;

        /**
        * Sets if the Pointer objects should record a history of x/y coordinates they have passed through.
        * The history is cleared each time the Pointer is pressed down.
        * The history is updated at the rate specified in Input.pollRate
        * @property recordPointerHistory
        * @type {bool}
        **/
        public recordPointerHistory: bool = false;

        /**
        * The rate in milliseconds at which the Pointer objects should update their tracking history
        * @property recordRate
        * @type {Number}
        */
        public recordRate: number = 100;

        /**
        * The total number of entries that can be recorded into the Pointer objects tracking history.
        * If the Pointer is tracking one event every 100ms, then a trackLimit of 100 would store the last 10 seconds worth of history.
        * @property recordLimit
        * @type {Number}
        */
        public recordLimit: number = 100;

        /**
        * A Pointer object specifically used by the Mouse
        * @property mousePointer
        * @type {Pointer}
        **/
        public mousePointer: Pointer;

        /**
        * A Pointer object
        * @property pointer1
        * @type {Pointer}
        **/
        public pointer1: Pointer;

        /**
        * A Pointer object
        * @property pointer2
        * @type {Pointer}
        **/
        public pointer2: Pointer;

        /**
        * A Pointer object
        * @property pointer3
        * @type {Pointer}
        **/
        public pointer3: Pointer = null;

        /**
        * A Pointer object
        * @property pointer4
        * @type {Pointer}
        **/
        public pointer4: Pointer = null;

        /**
        * A Pointer object
        * @property pointer5
        * @type {Pointer}
        **/
        public pointer5: Pointer = null;

        /**
        * A Pointer object
        * @property pointer6
        * @type {Pointer}
        **/
        public pointer6: Pointer = null;

        /**
        * A Pointer object
        * @property pointer7
        * @type {Pointer}
        **/
        public pointer7: Pointer = null;

        /**
        * A Pointer object
        * @property pointer8
        * @type {Pointer}
        **/
        public pointer8: Pointer = null;

        /**
        * A Pointer object
        * @property pointer9
        * @type {Pointer}
        **/
        public pointer9: Pointer = null;

        /**
        * A Pointer object
        * @property pointer10
        * @type {Pointer}
        **/
        public pointer10: Pointer = null;

        /**
        * The most recently active Pointer object.
        * When you've limited max pointers to 1 this will accurately be either the first finger touched or mouse.
        * @property activePointer
        * @type {Pointer}
        **/
        public activePointer: Pointer = null;

        public inputObjects = [];

        public totalTrackedObjects: number = 0;

        /**
        * The X coordinate of the most recently active pointer.
        * This value takes game scaling into account automatically. See Pointer.screenX/clientX for source values.
        * @property x
        * @type {Number}
        **/
        public get x(): number {
            return this._x;
        }

        public set x(value: number) {
            this._x = Math.floor(value);
        }

        /**
        * The Y coordinate of the most recently active pointer.
        * This value takes game scaling into account automatically. See Pointer.screenY/clientY for source values.
        * @property y
        * @type {Number}
        **/
        public get y(): number {
            return this._y;
        }

        public set y(value: number) {
            this._y = Math.floor(value);
        }

        /**
        * Add a new Pointer object to the Input Manager. By default Input creates 2 pointer objects for you. If you need more
        * use this to create a new one, up to a maximum of 10.
        * @method addPointer
        * @return {Pointer} A reference to the new Pointer object
        **/
        public addPointer(): Pointer {

            var next: number = 0;

            for (var i = 10; i > 0; i--)
            {
                if (this['pointer' + i] === null)
                {
                    next = i;
                }
            }

            if (next == 0)
            {
                throw new Error("You can only have 10 Pointer objects");
                return null;
            }
            else
            {
                this['pointer' + next] = new Pointer(this.game, next);
                return this['pointer' + next];
            }

        }

        /**
        * Starts the Input Manager running
        * @method start
        **/
        public boot() {

            this.mouse.start();
            this.keyboard.start();
            this.touch.start();
            this.mspointer.start();
            //this.gestures.start();

            this.mousePointer.active = true;

        }

        /**
        * Adds a new game object to be tracked by the Input Manager. Called by the Sprite.Input component, should not usually be called directly.
        * @method addGameObject
        **/
        public addGameObject(object) {

            //  Find a spare slot
            for (var i = 0; i < this.inputObjects.length; i++)
            {
                if (this.inputObjects[i] == null)
                {
                    this.inputObjects[i] = object;
                    object.input.indexID = i;
                    this.totalTrackedObjects++;
                    return;
                }
            }

            //  If we got this far we need to push a new entry into the array
            object.input.indexID = this.inputObjects.length;

            this.inputObjects.push(object);

            this.totalTrackedObjects++;

        }

        /**
        * Removes a game object from the Input Manager. Called by the Sprite.Input component, should not usually be called directly.
        * @method removeGameObject
        **/
        public removeGameObject(index: number) {

            if (this.inputObjects[index])
            {
                this.inputObjects[index] = null;
            }

        }

        public get pollLocked(): bool {
            return (this.pollRate > 0 && this._pollCounter < this.pollRate);
        }

        /**
        * Updates the Input Manager. Called by the core Game loop.
        * @method update
        **/
        public update() {

            if (this.pollRate > 0 && this._pollCounter < this.pollRate)
            {
                this._pollCounter++;
                return;
            }

            this.speed.x = this.position.x - this._oldPosition.x;
            this.speed.y = this.position.y - this._oldPosition.y;

            this._oldPosition.copyFrom(this.position);

            this.mousePointer.update();
            this.pointer1.update();
            this.pointer2.update();

            if (this.pointer3) { this.pointer3.update(); }
            if (this.pointer4) { this.pointer4.update(); }
            if (this.pointer5) { this.pointer5.update(); }
            if (this.pointer6) { this.pointer6.update(); }
            if (this.pointer7) { this.pointer7.update(); }
            if (this.pointer8) { this.pointer8.update(); }
            if (this.pointer9) { this.pointer9.update(); }
            if (this.pointer10) { this.pointer10.update(); }

            this._pollCounter = 0;

        }

        /**
        * Reset all of the Pointers and Input states
        * @method reset
        * @param hard {bool} A soft reset (hard = false) won't reset any signals that might be bound. A hard reset will.
        **/
        public reset(hard: bool = false) {

            this.keyboard.reset();

            this.mousePointer.reset();

            for (var i = 1; i <= 10; i++)
            {
                if (this['pointer' + i])
                {
                    this['pointer' + i].reset();
                }
            }

            this.currentPointers = 0;

            this.game.stage.canvas.style.cursor = "default";

            if (hard == true)
            {
                this.onDown.dispose();
                this.onUp.dispose();
                this.onTap.dispose();
                this.onHold.dispose();

                this.onDown = new Phaser.Signal();
                this.onUp = new Phaser.Signal();
                this.onTap = new Phaser.Signal();
                this.onHold = new Phaser.Signal();

                for (var i = 0; i < this.totalTrackedObjects; i++)
                {
                    if (this.inputObjects[i] && this.inputObjects[i].input)
                    {
                        this.inputObjects[i].input.reset();
                    }
                }

                this.inputObjects.length = 0;
                this.totalTrackedObjects = 0;
            }

            this._pollCounter = 0;

        }

        public resetSpeed(x: number, y: number) {
            this._oldPosition.setTo(x, y);
            this.speed.setTo(0, 0);
        }

        /**
        * Get the total number of inactive Pointers
        * @method totalInactivePointers
        * @return {Number} The number of Pointers currently inactive
        **/
        public get totalInactivePointers(): number {

            return 10 - this.currentPointers;

        }

        /**
        * Recalculates the total number of active Pointers
        * @method totalActivePointers
        * @return {Number} The number of Pointers currently active
        **/
        public get totalActivePointers(): number {

            this.currentPointers = 0;

            for (var i = 1; i <= 10; i++)
            {
                if (this['pointer' + i] && this['pointer' + i].active)
                {
                    this.currentPointers++;
                }
            }

            return this.currentPointers;

        }

        /**
        * Find the first free Pointer object and start it, passing in the event data.
        * @method startPointer
        * @param {Any} event The event data from the Touch event
        * @return {Pointer} The Pointer object that was started or null if no Pointer object is available
        **/
        public startPointer(event): Pointer {

            if (this.maxPointers < 10 && this.totalActivePointers == this.maxPointers)
            {
                return null;
            }

            //  Unrolled for speed
            if (this.pointer1.active == false)
            {
                return this.pointer1.start(event);
            }
            else if (this.pointer2.active == false)
            {
                return this.pointer2.start(event);
            }
            else
            {
                for (var i = 3; i <= 10; i++)
                {
                    if (this['pointer' + i] && this['pointer' + i].active == false)
                    {
                        return this['pointer' + i].start(event);
                    }
                }
            }

            return null;

        }

        /**
        * Updates the matching Pointer object, passing in the event data.
        * @method updatePointer
        * @param {Any} event The event data from the Touch event
        * @return {Pointer} The Pointer object that was updated or null if no Pointer object is available
        **/
        public updatePointer(event): Pointer {

            //  Unrolled for speed
            if (this.pointer1.active && this.pointer1.identifier == event.identifier)
            {
                return this.pointer1.move(event);
            }
            else if (this.pointer2.active && this.pointer2.identifier == event.identifier)
            {
                return this.pointer2.move(event);
            }
            else
            {
                for (var i = 3; i <= 10; i++)
                {
                    if (this['pointer' + i] && this['pointer' + i].active && this['pointer' + i].identifier == event.identifier)
                    {
                        return this['pointer' + i].move(event);
                    }
                }
            }

            return null;

        }

        /**
        * Stops the matching Pointer object, passing in the event data.
        * @method stopPointer
        * @param {Any} event The event data from the Touch event
        * @return {Pointer} The Pointer object that was stopped or null if no Pointer object is available
        **/
        public stopPointer(event): Pointer {

            //  Unrolled for speed
            if (this.pointer1.active && this.pointer1.identifier == event.identifier)
            {
                return this.pointer1.stop(event);
            }
            else if (this.pointer2.active && this.pointer2.identifier == event.identifier)
            {
                return this.pointer2.stop(event);
            }
            else
            {
                for (var i = 3; i <= 10; i++)
                {
                    if (this['pointer' + i] && this['pointer' + i].active && this['pointer' + i].identifier == event.identifier)
                    {
                        return this['pointer' + i].stop(event);
                    }
                }
            }

            return null;

        }

        /**
        * Get the next Pointer object whos active property matches the given state
        * @method getPointer
        * @param {bool} state The state the Pointer should be in (false for inactive, true for active)
        * @return {Pointer} A Pointer object or null if no Pointer object matches the requested state.
        **/
        public getPointer(state: bool = false): Pointer {

            //  Unrolled for speed
            if (this.pointer1.active == state)
            {
                return this.pointer1;
            }
            else if (this.pointer2.active == state)
            {
                return this.pointer2;
            }
            else
            {
                for (var i = 3; i <= 10; i++)
                {
                    if (this['pointer' + i] && this['pointer' + i].active == state)
                    {
                        return this['pointer' + i];
                    }
                }
            }

            return null;

        }

        /**
        * Get the Pointer object whos identified property matches the given identifier value
        * @method getPointerFromIdentifier
        * @param {Number} identifier The Pointer.identifier value to search for
        * @return {Pointer} A Pointer object or null if no Pointer object matches the requested identifier.
        **/
        public getPointerFromIdentifier(identifier: number): Pointer {

            //  Unrolled for speed
            if (this.pointer1.identifier == identifier)
            {
                return this.pointer1;
            }
            else if (this.pointer2.identifier == identifier)
            {
                return this.pointer2;
            }
            else
            {
                for (var i = 3; i <= 10; i++)
                {
                    if (this['pointer' + i] && this['pointer' + i].identifier == identifier)
                    {
                        return this['pointer' + i];
                    }
                }
            }

            return null;

        }

        public get worldX(): number {

            if (this.camera)
            {
                return (this.camera.worldView.x - this.camera.screenView.x) + this.x;
            }

            return null;

        }

        public get worldY(): number {

            if (this.camera)
            {
                return (this.camera.worldView.y - this.camera.screenView.y) + this.y;
            }

            return null;
        }

        /**
        * Get the distance between two Pointer objects
        * @method getDistance
        * @param {Pointer} pointer1
        * @param {Pointer} pointer2
        **/
        public getDistance(pointer1: Pointer, pointer2: Pointer): number {
            return Vec2Utils.distance(pointer1.position, pointer2.position);
        }

        /**
        * Get the angle between two Pointer objects
        * @method getAngle
        * @param {Pointer} pointer1
        * @param {Pointer} pointer2
        **/
        public getAngle(pointer1: Pointer, pointer2: Pointer): number {
            return Vec2Utils.angle(pointer1.position, pointer2.position);
        }

        public pixelPerfectCheck(sprite: Phaser.Sprite, pointer: Phaser.Pointer, alpha: number = 255): bool {

            this.hitContext.clearRect(0, 0, 1, 1);

            return true;

        }

    }

}