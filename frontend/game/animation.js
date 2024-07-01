import * as THREE from 'three';
import { g } from './globals.js';
import { bulbLuminousPowers, hemiLuminousIrradiances } from './utils.js';   // utility functions and parameters used in the scene
import { paddleDirection, aiPaddleDirection, player2PaddleDirection } from './events.js'; // event listeners for window resize events and keyboard input

export function updateLighting() {
    g.renderer.toneMappingExposure = Math.pow(g.exposure, 5.0);
    g.renderer.shadowMap.enabled = g.shadows;
    g.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    g.bulbLight.castShadow = g.shadows;

    if (g.shadows !== g.previousShadowMap) {
        if (g.shadows) {
            g.floorMat.side = THREE.FrontSide;
            g.floorMat.needsUpdate = true;
        }
        g.previousShadowMap = g.shadows;
    }

    if (g.shadows) {
        g.bulbLight.shadow.mapSize.width = 1024;
        g.bulbLight.shadow.mapSize.height = 1024;
        g.bulbLight.shadow.camera.near = 0.2;
        g.bulbLight.shadow.camera.far = 100; // Adjust based on your scene size
        g.bulbLight.shadow.bias = -0.0001; // Adjust this value as needed
    }

    g.bulbLight.power = bulbLuminousPowers[g.bulbPower];
    g.bulbMat.emissiveIntensity = g.bulbLight.intensity / Math.pow(0.02, 2.0);
    g.hemiLight.intensity = hemiLuminousIrradiances[g.hemiIrradiance];

    updateObjectShadows();
}

function updateObjectShadows() {
    g.scene.traverse(function(object) {
        if (object.isMesh) {
            if (object.name === 'floor') {
                object.receiveShadow = g.shadows;
            } else {
                object.castShadow = g.shadows;
                // Slightly raise non-floor objects
                if (object.position.y === 0) {
                    object.position.y += 0.01;
                }
            }
        }
    });
}

// export function movePlayerPaddle() {
//     let delta = 0.008; // Time delta between frames (60 frames per second)
//     g.paddleMesh.position.x += paddleDirection.x * g.paddleSpeed * 0.016; // Move the paddle in the x direction
//     g.paddleMesh.position.z += paddleDirection.z * g.paddleSpeed * 0.016; // Move the paddle in the z direction

//     // Create bounding boxes for the paddle and ball
//     const paddleBox = new THREE.Box3().setFromObject(g.paddleMesh);
//     const ballBox = new THREE.Box3().setFromObject(g.bulbLight);

//     // If the paddle intersects with the ball, prevent the paddle from moving further
//     if (paddleBox.intersectsBox(ballBox)) {
//         g.paddleMesh.position.x -= paddleDirection.x * g.paddleSpeed * delta; // when it's 0.016, the ball does change direction
//         g.paddleMesh.position.z -= paddleDirection.z * g.paddleSpeed * delta; // when it's 0.016, the ball does change direction
//     }
// }

export function movePlayerPaddle() {
    const delta = 0.016; // Time delta between frames (60 frames per second)
    const paddleSpeed = g.paddleSpeed * delta;

    // Calculate paddle velocity
    const paddleVelocity = new THREE.Vector3(
        (g.paddleMesh.position.x - g.prevPaddlePosition.x) / delta, 0, (g.paddleMesh.position.z - g.prevPaddlePosition.z) / delta );

    // Update previous paddle position
    g.prevPaddlePosition.copy(g.paddleMesh.position);

    g.paddleMesh.position.x += paddleDirection.x * paddleSpeed;
    g.paddleMesh.position.z += paddleDirection.z * paddleSpeed;

    // Create bounding boxes for the paddle and ball
    const paddleBox = new THREE.Box3().setFromObject(g.paddleMesh);
    const ballBox = new THREE.Box3().setFromObject(g.bulbLight);

    // If the paddle intersects with the ball, prevent the paddle from moving further
    if (paddleBox.intersectsBox(ballBox)) {
        g.paddleMesh.position.x -= paddleDirection.x * paddleSpeed * delta;
        g.paddleMesh.position.z -= paddleDirection.z * paddleSpeed * delta;
    }

    g.paddleVelocity = paddleVelocity; // Store paddle velocity for collision handling
}


export function movePlayer2Paddle() {
    const speed = 0.1;  // Adjust speed as needed

    // Move player 2 paddle based on player2PaddleDirection
    g.aiPaddleMesh.position.z += player2PaddleDirection.z * speed;
    g.aiPaddleMesh.position.x += player2PaddleDirection.x * speed;

    // Limit paddle movement within boundaries (adjust as per your game's logic)
    const paddleHalfSize = 10;  // Adjust based on paddle size
    g.aiPaddleMesh.position.z = THREE.MathUtils.clamp(
        g.aiPaddleMesh.position.z,
        -paddleHalfSize,
        paddleHalfSize
    );
    g.aiPaddleMesh.position.x = THREE.MathUtils.clamp(
        g.aiPaddleMesh.position.x,
        -paddleHalfSize,
        paddleHalfSize
    );
}

export function moveAIPaddle() {
    const { bulbLight, aiPaddleMesh } = g; // Destructuring for clarity
    const { paddleBoundary, easingFactor, tolerance, aiPaddleSpeed } = g;

    // Calculate target position and clamp to boundaries
    const targetX = Math.max(-paddleBoundary, Math.min(bulbLight.position.x, paddleBoundary));

    // Determine distance to target
    const distanceToTarget = targetX - aiPaddleMesh.position.x;
    const absDistance = Math.abs(distanceToTarget);

    // Move towards target with easing or stop if within tolerance
    aiPaddleDirection.x = absDistance > tolerance
        ? distanceToTarget * easingFactor
        : 0;

    // Calculate AI paddle velocity
    const aiPaddleVelocity = new THREE.Vector3(
        (aiPaddleMesh.position.x - g.prevAIPaddlePosition.x) / 0.016,
        0,
        0
    );

    // Update previous AI paddle position
    g.prevAIPaddlePosition.copy(aiPaddleMesh.position);

    aiPaddleMesh.position.x += aiPaddleDirection.x * aiPaddleSpeed * 0.016;

    // Store AI paddle velocity for collision handling
    g.aiPaddleVelocity = aiPaddleVelocity;
}


export function moveBall() {
    const maxSpeed = 20; // maximum speed limit
    if (g.ballVelocity.length() > maxSpeed) {
        g.ballVelocity.setLength(maxSpeed); // velocity to the maximum speed
    }
    g.bulbLight.position.add(g.ballVelocity.clone().multiplyScalar(g.ballSpeed));
}

// export function handleCollisions() {
//     // Ball and paddle collision detection
//     const ballBox = new THREE.Box3().setFromObject(g.bulbLight);        // Create a bounding box for the ball
//     const paddleBox = new THREE.Box3().setFromObject(g.paddleMesh);     // Create a bounding box for the player paddle
//     const aiPaddleBox = new THREE.Box3().setFromObject(g.aiPaddleMesh); // Create a bounding box for the AI paddle

//     // Check for collision between the ball and the player paddle
//     if (ballBox.intersectsBox(paddleBox)) {
//         const impactX = g.bulbLight.position.x - g.paddleMesh.position.x;

//         // Adjust ball's velocity
//         g.ballVelocity.z = -Math.abs(g.ballVelocity.z); // Always move away from the paddle
//         g.ballVelocity.x += impactX * 10.8; // Adjust x velocity based on impact point
//     }

//     // Check collision with AI paddle
//     if (ballBox.intersectsBox(aiPaddleBox)) {
//         // Calculate impact point relative to AI paddle center
//         const impactX = g.bulbLight.position.x - g.aiPaddleMesh.position.x;

//         // Adjust ball's velocity
//         g.ballVelocity.z = Math.abs(g.ballVelocity.z); // Always move away from the paddle
//         g.ballVelocity.x += impactX * 10.8; // Adjust x velocity based on impact point
//     }

//     // Check collision with left and right walls
//     if (g.bulbLight.position.x < -g.wallBoundary || g.bulbLight.position.x > g.wallBoundary) {
//         g.ballVelocity.x = -g.ballVelocity.x; // Reverse x velocity
//     }
// }

export function handleCollisions() {
    const ballBox = new THREE.Box3().setFromObject(g.bulbLight);
    const paddleBox = new THREE.Box3().setFromObject(g.paddleMesh);
    const aiPaddleBox = new THREE.Box3().setFromObject(g.aiPaddleMesh);

    const increaseSpeed = (velocity, factor) => {
        velocity.multiplyScalar(factor);
        const maxSpeed = 10; // maximum speed limit
        if (velocity.length() > maxSpeed) {
            velocity.setLength(maxSpeed); // velocity to the maximum speed
        }
        return velocity;
    };

    const baseSpeedIncrease = 1.00; // Base speed increase factor for any paddle hit
    const sideSpeedIncrease = 1.00;  // Extra speed increase factor for side hits

    // Check for collision between the ball and the player paddle
    if (ballBox.intersectsBox(paddleBox)) {
        const impactX = g.bulbLight.position.x - g.paddleMesh.position.x;
        const impactZ = g.bulbLight.position.z - g.paddleMesh.position.z;

        // Adjust ball's velocity
        g.ballVelocity.z = -Math.abs(g.ballVelocity.z); // Always move away from the paddle
        g.ballVelocity.x += impactX * 0.2; // Adjust x velocity based on impact point

        // Incorporate paddle's velocity into ball's redirection
        g.ballVelocity.add(g.paddleVelocity.clone().multiplyScalar(1.5));

        // Increase ball speed
        if (Math.abs(impactX) > 1) {
            g.ballVelocity = increaseSpeed(g.ballVelocity, sideSpeedIncrease);
        } else {
            g.ballVelocity = increaseSpeed(g.ballVelocity, baseSpeedIncrease);
        }
    }

    // Check collision with AI paddle
    if (ballBox.intersectsBox(aiPaddleBox)) {
        const impactX = g.bulbLight.position.x - g.aiPaddleMesh.position.x;

        // Adjust ball's velocity
        g.ballVelocity.z = Math.abs(g.ballVelocity.z); // Always move away from the paddle
        g.ballVelocity.x += impactX * 0.2; // Adjust x velocity based on impact point

        // Incorporate AI paddle's velocity into ball's redirection
        g.ballVelocity.add(g.aiPaddleVelocity.clone().multiplyScalar(0.5));

        // Increase ball speed
        if (Math.abs(impactX) > 0.1) {
            g.ballVelocity = increaseSpeed(g.ballVelocity, sideSpeedIncrease);
        } else {
            g.ballVelocity = increaseSpeed(g.ballVelocity, baseSpeedIncrease);
        }
    }

    // Check collision with left and right walls
    if (g.bulbLight.position.x < -g.wallBoundary || g.bulbLight.position.x > g.wallBoundary) {
        g.ballVelocity.x = -g.ballVelocity.x; // Reverse x velocity
    }
}





export function checkMissedBall() {
    // Check if the ball has missed the player paddle
    if (g.bulbLight.position.z > g.wallBoundary) {
        g.aiScore++;
        g.bulbLight.position.set(0, 0.2, 0);
        g.ballVelocity.set(0, 0, 5);
        updateScoreDisplay(g);
    } else if (g.bulbLight.position.z < -g.wallBoundary) {
        g.playerScore++;
        g.bulbLight.position.set(0, 0.2, 0);
        g.ballVelocity.set(0, 0, -5);
        updateScoreDisplay(g);
    }
}

export function initScoreDisplay() {
    // Create player score text element
    g.playerScoreText = document.createElement('div');
    g.playerScoreText.style.position = 'absolute';
    g.playerScoreText.style.top = '10px';
    g.playerScoreText.style.left = '300px';
    g.playerScoreText.style.color = '#ffffff';
    g.playerScoreText.style.fontFamily = 'Arial, sans-serif';
    g.playerScoreText.style.fontSize = '24px';
    document.body.appendChild(g.playerScoreText);

    // Create AI score text element
    g.aiScoreText = document.createElement('div');
    g.aiScoreText.style.position = 'absolute';
    g.aiScoreText.style.top = '10px';
    g.aiScoreText.style.right = '300px';
    g.aiScoreText.style.color = '#ffffff';
    g.aiScoreText.style.fontFamily = 'Arial, sans-serif';
    g.aiScoreText.style.fontSize = '24px';
    document.body.appendChild(g.aiScoreText);

    // Initial update of score display
    updateScoreDisplay();
}

export function updateScoreDisplay() {
    // Check the scoreLimit to determine if a player has won
    if (g.playerScore >= g.limitScore) {
        alert('Player wins!');
        g.playerScore = 0;
        g.aiScore = 0;
    } else if (g.aiScore >= g.limitScore) {
        alert('AI wins!');
        g.playerScore = 0;
        g.aiScore = 0;
    }

    // Update the player and AI score text elements
    if (!g.playerScoreText) {
        g.playerScoreText = document.createElement('div');
        g.playerScoreText.style.position = 'absolute';
        g.playerScoreText.style.top = '10px';
        g.playerScoreText.style.left = '200px';
        g.playerScoreText.style.color = '#ffffff';
        g.playerScoreText.style.fontFamily = 'Arial, sans-serif';
        g.playerScoreText.style.fontSize = '24px';
        document.body.appendChild(g.playerScoreText);
    }

    if (!g.aiScoreText) {
        g.aiScoreText = document.createElement('div');
        g.aiScoreText.style.position = 'absolute';
        g.aiScoreText.style.top = '10px';
        g.aiScoreText.style.right = '400px';
        g.aiScoreText.style.color = '#ffffff';
        g.aiScoreText.style.fontFamily = 'Arial, sans-serif';
        g.aiScoreText.style.fontSize = '24px';
        document.body.appendChild(g.aiScoreText);
    }

    g.playerScoreText.textContent = `Player Score: ${g.playerScore}`;
    g.aiScoreText.textContent = `AI Score: ${g.aiScore}`;
}

export function checkBounds() {
    // Check if the paddle has reached the boundaries

    if (g.paddleMesh.position.x < -g.paddleBoundary) {
        g.paddleMesh.position.x = -g.paddleBoundary; // Reset paddle position
    } else if (g.paddleMesh.position.x > g.paddleBoundary) {
        g.paddleMesh.position.x = g.paddleBoundary; // Reset paddle position
    }

    if (g.paddleMesh.position.z < -g.paddleBoundary) {
        g.paddleMesh.position.z = -g.paddleBoundary; // Reset paddle position
    } else if (g.paddleMesh.position.z > g.paddleBoundary) {
        g.paddleMesh.position.z = g.paddleBoundary; // Reset paddle position
    }
}

export function orbitalRotation() {
    if (g.isOrbiting) {
        g.orbitAngle += g.orbitSpeed; // Increment the angle
        g.camera.position.x = g.orbitCenter.x + g.orbitRadius * Math.cos(g.orbitAngle);
        g.camera.position.z = g.orbitCenter.z + g.orbitRadius * Math.sin(g.orbitAngle);
        g.camera.lookAt(g.orbitCenter); // Ensure the camera looks at the center of the orbit (table)
    }
}
