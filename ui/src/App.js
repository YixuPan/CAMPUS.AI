import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import './App.css';
import LogoButton from './components/LogoButton';
// Global animation state to persist between navigation
const globalAnimationState = {
    isAnimating: true,
    time: 0,
    lastTimestamp: 0
};
// Animation loop running outside of React to ensure continuous animation
(function setupGlobalAnimation() {
    const animate = (timestamp) => {
        // Calculate delta time
        const delta = globalAnimationState.lastTimestamp ? (timestamp - globalAnimationState.lastTimestamp) / 1000 : 0;
        globalAnimationState.lastTimestamp = timestamp;
        // Update time if animation is active
        if (globalAnimationState.isAnimating) {
            globalAnimationState.time += delta;
        }
        // Continue the animation loop
        requestAnimationFrame(animate);
    };
    // Start animation loop
    requestAnimationFrame(animate);
})();
// 3D Siri-like jellyfish component that always stays jellyfish
function SiriJellyfish() {
    const meshRef = useRef(null);
    const { mouse, viewport, size, camera } = useThree();
    const [mousePos] = useState(new THREE.Vector3());
    // Run exactly once, immediately after mount
    useEffect(() => {
        if (!meshRef.current)
            return;
        const mat = meshRef.current.material;
        mat.uniforms.uTime.value = 0;
        mat.uniforms.uMouse.value.set(0, 0, 0);
        // ensure animation is on
        globalAnimationState.isAnimating = true;
    }, []); // ← empty deps
    // Add global mouse move listener as a backup
    useEffect(() => {
        const handleMouseMove = (e) => {
            // Calculate normalized mouse position (-1 to 1)
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            // Update mousePos immediately
            mousePos.set(x * (viewport.width / 2), y * (viewport.height / 2), 0);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [viewport]);
    // Animation loop with ALL effects moved here
    useFrame(() => {
        if (!meshRef.current)
            return;
        // Always ensure animation is active
        globalAnimationState.isAnimating = true;
        const time = globalAnimationState.time;
        const mesh = meshRef.current;
        // Get the shader material
        const material = mesh.material;
        // Update time and mouse uniforms
        material.uniforms.uTime.value = time;
        material.uniforms.uMouse.value.copy(mousePos);
        // Keep rotation constant
        mesh.rotation.y = time * 0.1;
        // Get access to geometry to manipulate vertices directly
        const geometry = mesh.geometry;
        const positions = geometry.attributes.position;
        // If we have original positions stored, use them, otherwise store them
        if (!geometry.userData.originalPositions) {
            const originalPositions = new Float32Array(positions.array.length);
            originalPositions.set(positions.array);
            geometry.userData.originalPositions = originalPositions;
        }
        // Get original positions
        const originalPositions = geometry.userData.originalPositions;
        // Create temporary array for modified positions
        const modifiedPositions = new Float32Array(positions.array.length);
        // Apply all effects directly in JavaScript
        for (let i = 0; i < positions.count; i++) {
            const idx = i * 3;
            const x = originalPositions[idx];
            const y = originalPositions[idx + 1];
            const z = originalPositions[idx + 2];
            // Original position vector
            const pos = new THREE.Vector3(x, y, z);
            const direction = pos.clone().normalize();
            // 1. Breathing effect
            const breathingSpeed = 0.7;
            const breathingStrength = 0.12;
            const breathing = Math.sin(time * breathingSpeed) * breathingStrength + 1.0;
            // 2. Wave pattern using noise (simplified version for JS)
            const noiseValue = simplex3(x * 2.0 + time * 0.5, y * 3.0, z * 2.0 - time * 0.5) * 0.2;
            // 3. Create concentric rings
            const ringRadius = Math.sqrt(x * x + z * z);
            const rings = Math.sin(ringRadius * 6.0 - time * 1.5) * 0.1 * (1.0 - Math.abs(y));
            // 4. Additional waves
            const waves = Math.sin(y * 8.0 + time) * 0.05 * (1.0 - Math.abs(y));
            // 5. Mouse effect
            let mouseEffect = 0.0;
            const worldPos = new THREE.Vector3(x, y, z);
            worldPos.applyMatrix4(mesh.matrixWorld);
            const distanceToMouse = worldPos.distanceTo(new THREE.Vector3(mousePos.x, mousePos.y, worldPos.z));
            if (distanceToMouse < 2.0) {
                const mouseWave = Math.sin(distanceToMouse * 5.0 - time * 3.0) * 0.15;
                mouseEffect = mouseWave * (1.0 - distanceToMouse / 2.0) * 0.5;
            }
            // Combine all jellyfish effects
            const jellyfishEffect = noiseValue + rings + waves + mouseEffect;
            // Apply jellyfish effects with breathing
            const jellyfishPos = pos.clone().add(direction.multiplyScalar(jellyfishEffect));
            jellyfishPos.multiplyScalar(breathing);
            // Set the modified position
            modifiedPositions[idx] = jellyfishPos.x;
            modifiedPositions[idx + 1] = jellyfishPos.y;
            modifiedPositions[idx + 2] = jellyfishPos.z;
        }
        // Update geometry with modified positions
        positions.array.set(modifiedPositions);
        positions.needsUpdate = true;
    });
    // Simple 3D simplex noise implementation for JS
    function simplex3(x, y, z) {
        // Very simplified noise function that mimics the shader's noise
        return (Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x)) * 0.16667;
    }
    return (_jsxs("mesh", { ref: meshRef, children: [_jsx("sphereGeometry", { args: [1, 128, 128] }), _jsx("shaderMaterial", { vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying float vDistanceToMouse;
          
          uniform float uTime;
          uniform vec3 uMouse;
          
          void main() {
            vUv = uv;
            vPosition = position;
            vNormal = normalize(normalMatrix * normal);
            
            // Calculate distance to mouse in world space
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vec3 mousePos = uMouse;
            float distanceToMouse = distance(worldPosition.xyz, vec3(mousePos.xy, worldPosition.z));
            vDistanceToMouse = distanceToMouse;
            
            // Position is now handled directly in the useFrame function
            // We just pass through the positions that were modified in JavaScript
            
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            
            gl_Position = projectedPosition;
          }
        `, fragmentShader: `
          uniform float uTime;
          
          varying vec2 vUv;
          varying vec3 vPosition;
          varying vec3 vNormal;
          varying float vDistanceToMouse;
          
          void main() {
            // Gradient colors for jellyfish
            float yGradient = smoothstep(-1.5, 1.5, vPosition.y);
            vec3 jellyfishTopColor = vec3(0.1, 0.4, 0.8);    // Lighter blue top
            vec3 jellyfishBottomColor = vec3(0.02, 0.1, 0.3); // Darker blue bottom
            vec3 jellyfishGradient = mix(jellyfishBottomColor, jellyfishTopColor, yGradient);
            
            // Edge glow for jellyfish
            float edge = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
            vec3 jellyfishEdgeColor = mix(jellyfishGradient, vec3(0.2, 0.5, 1.0), edge * 0.5);
            
            // Pulsing effect - CONSTANT STRENGTH
            float pulse = sin(uTime * 0.8) * 0.1 + 0.9;
            vec3 pulsedJellyfishColor = jellyfishEdgeColor * pulse;
            
            // Add highlights - CONSTANT STRENGTH
            float heightHighlight = sin(vPosition.y * 5.0 + uTime) * 0.1 + 0.1;
            vec3 jellyfishHighlights = pulsedJellyfishColor;
            jellyfishHighlights += vec3(heightHighlight * 0.1, heightHighlight * 0.3, heightHighlight * 0.7);
            
            // ENHANCED MOUSE INTERACTION - CONSTANT STRENGTH
            float mouseGlow = smoothstep(1.5, 0.0, vDistanceToMouse) * 0.3;
            jellyfishHighlights = mix(jellyfishHighlights, vec3(0.3, 0.6, 1.0), mouseGlow);
            
            // Final color is just the jellyfish with highlights
            vec3 finalColor = jellyfishHighlights;
            
            // Add subtle wave effect
            finalColor += vec3(0.02, 0.05, 0.1) * sin(uTime + vPosition.y * 10.0) * 0.05;
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `, uniforms: {
                    uTime: { value: 0 },
                    uMouse: { value: new THREE.Vector3(0, 0, 0) },
                }, side: THREE.FrontSide })] }));
}
// Main scene with improved event handling
function Scene() {
    // Use the global animation state
    useEffect(() => {
        return () => {
            // Never stop the animation completely, even when unmounting
            globalAnimationState.isAnimating = true;
        };
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx("ambientLight", { intensity: 0.4 }), _jsx("directionalLight", { position: [2, 1, 1], intensity: 0.5, color: "#ffffff" }), _jsx("pointLight", { position: [0, 0, 3], intensity: 0.6, color: "#2060ff" }), _jsx(SiriJellyfish, {})] }));
}
// Main App component with more reliable event handling
function App() {
    // Force mouse movement simulation on component mount
    useEffect(() => {
        // Simulate random mouse movements to activate effects
        const interval = setInterval(() => {
            if (!globalAnimationState.isAnimating) {
                globalAnimationState.isAnimating = true;
                // Create a synthetic mouse event at a random position
                const event = new MouseEvent('mousemove', {
                    clientX: Math.random() * window.innerWidth,
                    clientY: Math.random() * window.innerHeight
                });
                window.dispatchEvent(event);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);
    const [isChatMode, setIsChatMode] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messageEndRef = useRef(null);
    // Auto-scroll to latest message
    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);
    // Send message to Calendar API
    const handleSendMessage = async () => {
        if (inputValue.trim() === '' || isLoading)
            return;
        const newUserMessage = {
            content: inputValue,
            isUser: true
        };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);
        try {
            // Call the calendar API
            const response = await fetch('http://localhost:9000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: inputValue }),
            });
            if (!response.ok) {
                throw new Error('Failed to get response from calendar service');
            }
            const data = await response.json();
            const aiResponse = {
                content: data.response || "Sorry, I couldn't process your request.",
                isUser: false
            };
            setMessages(prev => [...prev, aiResponse]);
        }
        catch (error) {
            console.error('Error calling calendar API:', error);
            const errorMessage = {
                content: "Sorry, I couldn't connect to the calendar service. Please try again later.",
                isUser: false
            };
            setMessages(prev => [...prev, errorMessage]);
        }
        finally {
            setIsLoading(false);
        }
    };
    // Enter key handler
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { children: [_jsx(LogoButton, {}), _jsx("nav", { children: _jsxs("ul", { children: [_jsx("li", { className: "active", children: _jsx(Link, { to: "/", children: "CAMPUS.AI" }) }), _jsx("li", { children: _jsx(Link, { to: "/calendar", children: "Calendar" }) }), _jsx("li", { children: _jsx(Link, { to: "/booking", children: "Booking" }) }), _jsx("li", { children: _jsx(Link, { to: "/user", children: "User" }) }), _jsx("li", { children: _jsx("a", { href: "#about", children: "About" }) })] }) })] }), _jsx("main", { children: _jsxs("div", { className: "shader-container", children: [_jsx(Canvas, { camera: { position: [0, 0, 4], fov: 45 }, frameloop: "always", onCreated: ({ gl }) => {
                                // Set clear color to match background
                                gl.setClearColor(new THREE.Color('#080510'));
                                // Force context preservation to avoid issues on some browsers
                                gl.preserveDrawingBuffer = true;
                            }, children: _jsx(Scene, {}) }), _jsxs("div", { className: `overlay-text ${isChatMode ? 'fade-out' : ''}`, children: [_jsxs("h1", { children: [_jsx("span", { children: "Hi, I am " }), "CAMPUS.AI"] }), _jsx("button", { className: "ask-me-button", onClick: () => setIsChatMode(true), children: "Ask me anything" })] }), _jsxs("div", { className: `chat-interface ${isChatMode ? 'visible' : ''}`, children: [_jsxs("div", { className: "chat-header", children: [_jsx("button", { className: "back-button", onClick: () => setIsChatMode(false), children: "Back" }), _jsx("h2", { children: "Chat with CAMPUS.AI" })] }), _jsxs("div", { className: "chat-messages", children: [messages.length === 0 ? (_jsx("div", { className: "empty-chat", children: _jsx("p", { children: "Ask me about your schedule or to create calendar events..." }) })) : (messages.map((msg, index) => (_jsx("div", { className: `message ${msg.isUser ? 'user-message' : 'ai-message'}`, children: _jsx("div", { className: "message-content", children: msg.content }) }, index)))), isLoading && (_jsx("div", { className: "message ai-message", children: _jsx("div", { className: "message-content", children: "Thinking..." }) })), _jsx("div", { ref: messageEndRef })] }), _jsxs("div", { className: "chat-input-container", children: [_jsx("input", { type: "text", value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: handleKeyPress, placeholder: "Ask about your calendar, schedule events...", className: "chat-input", autoFocus: isChatMode, disabled: isLoading }), _jsx("button", { className: "send-button", onClick: handleSendMessage, disabled: inputValue.trim() === '' || isLoading, children: "Send" })] })] })] }) }), _jsx("footer", { children: _jsxs("div", { className: "social-links", children: [_jsx("a", { href: "https://github.com/login", target: "_blank", rel: "noopener noreferrer", "aria-label": "GitHub", children: _jsx("i", { className: "icon-github" }) }), _jsx("a", { href: "https://www.linkedin.com/login", target: "_blank", rel: "noopener noreferrer", "aria-label": "LinkedIn", children: _jsx("i", { className: "icon-linkedin" }) }), _jsx("a", { href: "https://outlook.live.com/owa/", target: "_blank", rel: "noopener noreferrer", "aria-label": "Email", children: _jsx("i", { className: "icon-mail" }) }), _jsx("a", { href: "https://bb.imperial.ac.uk", target: "_blank", rel: "noopener noreferrer", "aria-label": "Blackboard", children: _jsx("i", { className: "icon-bb" }) }), _jsx("a", { href: "https://edstem.org/us/dashboard", target: "_blank", rel: "noopener noreferrer", "aria-label": "Ed", children: _jsx("i", { className: "icon-ed" }) })] }) })] }));
}
export default App;
