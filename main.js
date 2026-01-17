window.addEventListener("DOMContentLoaded", () => {
    /* =====================
       BASIC SETUP
    ===================== */
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1);
    scene.collisionsEnabled = true;

    /* =====================
       LIGHTING
    ===================== */
    new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);

    const dir = new BABYLON.DirectionalLight(
        "dir",
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    dir.position = new BABYLON.Vector3(20, 40, 20);

    /* =====================
       GROUND
    ===================== */
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 50, height: 50 },
        scene
    );
    ground.checkCollisions = true;

    /* =====================
       PLAYER COLLIDER
    ===================== */
    const player = BABYLON.MeshBuilder.CreateCapsule(
        "player",
        { height: 2, radius: 0.5 },
        scene
    );
    player.position.y = 1;
    player.isVisible = false;
    player.checkCollisions = true;

    player.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    player.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);

    /* =====================
       VISUAL CHARACTER (6 PARTS)
    ===================== */
    const visualRoot = new BABYLON.TransformNode("visualRoot", scene);
    visualRoot.parent = player;

    const torso = BABYLON.MeshBuilder.CreateBox(
        "torso",
        { height: 1.2, width: 0.8, depth: 0.4 },
        scene
    );
    torso.parent = visualRoot;
    torso.position.y = 1.2;

    const head = BABYLON.MeshBuilder.CreateSphere(
        "head",
        { diameter: 0.6 },
        scene
    );
    head.parent = visualRoot;
    head.position.y = 2;

    const leftArm = BABYLON.MeshBuilder.CreateBox(
        "leftArm",
        { height: 1, width: 0.25, depth: 0.25 },
        scene
    );
    leftArm.parent = visualRoot;
    leftArm.position.set(-0.7, 1.2, 0);

    const rightArm = leftArm.clone("rightArm");
    rightArm.position.x = 0.7;

    const leftLeg = BABYLON.MeshBuilder.CreateBox(
        "leftLeg",
        { height: 1, width: 0.3, depth: 0.3 },
        scene
    );
    leftLeg.parent = visualRoot;
    leftLeg.position.set(-0.3, 0.2, 0);

    const rightLeg = leftLeg.clone("rightLeg");
    rightLeg.position.x = 0.3;

    /* =====================
       CAMERA (SEPARATED)
    ===================== */
    const cameraPivot = new BABYLON.TransformNode("cameraPivot", scene);
    cameraPivot.parent = player;
    cameraPivot.position.y = 1.5;

    const camera = new BABYLON.UniversalCamera(
        "camera",
        new BABYLON.Vector3(0, 0, -6),
        scene
    );
    camera.parent = cameraPivot;
    camera.attachControl(canvas, true);
    camera.minZ = 0.1;

    /* =====================
       INPUT
    ===================== */
    const input = {};
    window.addEventListener("keydown", e => input[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => input[e.key.toLowerCase()] = false);

    let yaw = 0;
    let pitch = 0;

    canvas.addEventListener("click", () => canvas.requestPointerLock());

    scene.onPointerObservable.add(e => {
        if (e.type !== BABYLON.PointerEventTypes.POINTERMOVE) return;
        yaw += e.event.movementX * 0.002;
        pitch += e.event.movementY * 0.002;
        pitch = BABYLON.Scalar.Clamp(pitch, -1.2, 1.2);
    });

    /* =====================
       MOVEMENT VARIABLES
    ===================== */
    let velocityY = 0;
    const speed = 5;
    const gravity = -20;
    const jumpForce = 8;

    /* =====================
       GAME LOOP
    ===================== */
    scene.onBeforeRenderObservable.add(() => {
        const dt = engine.getDeltaTime() / 1000;

        // camera rotation
        cameraPivot.rotation.y = yaw;
        camera.rotation.x = pitch;

        // movement direction
        let move = BABYLON.Vector3.Zero();
        const forward = new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const right = new BABYLON.Vector3(
            Math.sin(yaw + Math.PI / 2),
            0,
            Math.cos(yaw + Math.PI / 2)
        );

        if (input["w"]) move.addInPlace(forward);
        if (input["s"]) move.subtractInPlace(forward);
        if (input["a"]) move.subtractInPlace(right);
        if (input["d"]) move.addInPlace(right);

        if (move.length() > 0) move.normalize();

        // gravity + jump
        velocityY += gravity * dt;
        const grounded = player.position.y <= 1.01;

        if (grounded) {
            velocityY = 0;
            if (input[" "]) velocityY = jumpForce;
        }

        const movement = move.scale(speed * dt);
        movement.y = velocityY * dt;

        player.moveWithCollisions(movement);

        // rotate character toward movement
        if (move.length() > 0) {
            visualRoot.rotation.y = Math.atan2(move.x, move.z);
        }
    });

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
});
