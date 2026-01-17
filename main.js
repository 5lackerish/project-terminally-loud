window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("renderCanvas");
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color3(0.6, 0.8, 1);

    /* =======================
       PHYSICS
    ======================= */
    scene.enablePhysics(
        new BABYLON.Vector3(0, -9.81, 0),
        new BABYLON.CannonJSPlugin()
    );

    /* =======================
       CAMERA
    ======================= */
    const camera = new BABYLON.FreeCamera(
        "camera",
        new BABYLON.Vector3(0, 4, -8),
        scene
    );
    camera.attachControl(canvas, true);
    camera.speed = 0.5;
    camera.minZ = 0.1;

    /* =======================
       LIGHTS
    ======================= */
    const hemi = new BABYLON.HemisphericLight(
        "hemi",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    hemi.intensity = 0.6;

    const dir = new BABYLON.DirectionalLight(
        "dir",
        new BABYLON.Vector3(-1, -2, -1),
        scene
    );
    dir.position = new BABYLON.Vector3(20, 40, 20);
    dir.intensity = 0.8;

    /* =======================
       GROUND
    ======================= */
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        { width: 50, height: 50 },
        scene
    );

    ground.physicsImpostor = new BABYLON.PhysicsImpostor(
        ground,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 0, restitution: 0.1, friction: 1 },
        scene
    );

    /* =======================
       PLAYER PHYSICS ROOT
       (MUST BE A MESH)
    ======================= */
    const playerRoot = BABYLON.MeshBuilder.CreateBox(
        "playerRoot",
        { height: 3, width: 1, depth: 1 },
        scene
    );
    playerRoot.position = new BABYLON.Vector3(0, 2, 0);
    playerRoot.isVisible = false;

    playerRoot.physicsImpostor = new BABYLON.PhysicsImpostor(
        playerRoot,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1, restitution: 0, friction: 0.8 },
        scene
    );

    /* =======================
       MODULAR CHARACTER
    ======================= */
    const torso = BABYLON.MeshBuilder.CreateBox(
        "torso",
        { height: 2, width: 1, depth: 0.5 },
        scene
    );
    torso.parent = playerRoot;
    torso.position.y = 1;

    const head = BABYLON.MeshBuilder.CreateSphere(
        "head",
        { diameter: 0.8 },
        scene
    );
    head.parent = playerRoot;
    head.position.y = 2.5;

    const leftArm = BABYLON.MeshBuilder.CreateBox(
        "leftArm",
        { height: 1.5, width: 0.3, depth: 0.3 },
        scene
    );
    leftArm.parent = playerRoot;
    leftArm.position.set(-0.8, 1.25, 0);

    const rightArm = BABYLON.MeshBuilder.CreateBox(
        "rightArm",
        { height: 1.5, width: 0.3, depth: 0.3 },
        scene
    );
    rightArm.parent = playerRoot;
    rightArm.position.set(0.8, 1.25, 0);

    const leftLeg = BABYLON.MeshBuilder.CreateBox(
        "leftLeg",
        { height: 1.5, width: 0.4, depth: 0.4 },
        scene
    );
    leftLeg.parent = playerRoot;
    leftLeg.position.set(-0.3, -0.75, 0);

    const rightLeg = BABYLON.MeshBuilder.CreateBox(
        "rightLeg",
        { height: 1.5, width: 0.4, depth: 0.4 },
        scene
    );
    rightLeg.parent = playerRoot;
    rightLeg.position.set(0.3, -0.75, 0);

    /* =======================
       INPUT
    ======================= */
    const inputMap = {};
    scene.actionManager = new BABYLON.ActionManager(scene);

    scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyDownTrigger,
            (evt) => (inputMap[evt.sourceEvent.key.toLowerCase()] = true)
        )
    );

    scene.actionManager.registerAction(
        new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnKeyUpTrigger,
            (evt) => (inputMap[evt.sourceEvent.key.toLowerCase()] = false)
        )
    );

    /* =======================
       MOUSE LOOK
    ======================= */
    let isPointerDown = false;
    canvas.addEventListener("pointerdown", () => {
        isPointerDown = true;
        canvas.requestPointerLock();
    });
    canvas.addEventListener("pointerup", () => (isPointerDown = false));

    scene.onPointerObservable.add((pi) => {
        if (!isPointerDown) return;
        const e = pi.event;
        camera.rotation.y += e.movementX * 0.002;
        camera.rotation.x += e.movementY * 0.002;
    }, BABYLON.PointerEventTypes.POINTERMOVE);

    /* =======================
       MOVEMENT
    ======================= */
    const speed = 0.15;
    const jumpForce = 6;
    let canJump = false;

    scene.onBeforeRenderObservable.add(() => {
        const forward = camera.getDirection(BABYLON.Axis.Z);
        const right = camera.getDirection(BABYLON.Axis.X);

        const camForward = new BABYLON.Vector3(forward.x, 0, forward.z).normalize();
        const camRight = new BABYLON.Vector3(right.x, 0, right.z).normalize();

        let moveDir = BABYLON.Vector3.Zero();
        if (inputMap["w"]) moveDir.addInPlace(camForward);
        if (inputMap["s"]) moveDir.subtractInPlace(camForward);
        if (inputMap["a"]) moveDir.subtractInPlace(camRight);
        if (inputMap["d"]) moveDir.addInPlace(camRight);

        if (moveDir.length() > 0) moveDir.normalize();

        const vel = playerRoot.physicsImpostor.getLinearVelocity();
        const targetVel = moveDir.scale(speed * 60);

        const smooth = BABYLON.Vector3.Lerp(
            new BABYLON.Vector3(vel.x, 0, vel.z),
            targetVel,
            0.2
        );

        playerRoot.physicsImpostor.setLinearVelocity(
            new BABYLON.Vector3(smooth.x, vel.y, smooth.z)
        );

        /* Jump */
        if (inputMap[" "] && canJump) {
            playerRoot.physicsImpostor.applyImpulse(
                new BABYLON.Vector3(0, jumpForce, 0),
                playerRoot.getAbsolutePosition()
            );
            canJump = false;
        }

        /* Ground check (simple & stable) */
        if (playerRoot.position.y <= 2.05) {
            canJump = true;
        }

        /* Rotate player */
        if (moveDir.length() > 0) {
            const angle = Math.atan2(moveDir.x, moveDir.z);
            playerRoot.rotation.y = BABYLON.Scalar.LerpAngle(
                playerRoot.rotation.y,
                angle,
                0.2
            );
        }

        /* Limb animation */
        const t = performance.now() * 0.002;
        leftArm.rotation.x = Math.sin(t) * 0.5;
        rightArm.rotation.x = -Math.sin(t) * 0.5;
        leftLeg.rotation.x = Math.sin(t * 0.5) * 0.3;
        rightLeg.rotation.x = -Math.sin(t * 0.5) * 0.3;
        head.rotation.y = Math.sin(t * 0.3) * 0.5;

        /* Camera follow */
        camera.position.x = playerRoot.position.x;
        camera.position.z = playerRoot.position.z - 6;
        camera.position.y = playerRoot.position.y + 2;
    });

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
});
