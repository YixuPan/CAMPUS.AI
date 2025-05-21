import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import './App.css'
import LogoButton from './components/LogoButton'

// Global animation state to persist between navigation
const globalAnimationState = {
  isAnimating: true,
  time: 0,
  lastTimestamp: 0
};

// Animation loop running outside of React to ensure continuous animation
(function setupGlobalAnimation() {
  const animate = (timestamp: number) => {
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
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport } = useThree()
  const [mousePos] = useState(new THREE.Vector3())
  
  // Run exactly once, immediately after mount
  useEffect(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = 0;
    mat.uniforms.uMouse.value.set(0, 0, 0);
    // ensure animation is on
    globalAnimationState.isAnimating = true;
  }, []);  // ← empty deps

  // Add global mouse move listener as a backup
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse position (-1 to 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Update mousePos immediately
        mousePos.set(
          x * (viewport.width / 2),
          y * (viewport.height / 2),
          0
        );
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [viewport]);
  
  // Animation loop with ALL effects moved here
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Always ensure animation is active
    globalAnimationState.isAnimating = true;
    
    const time = globalAnimationState.time;
    const mesh = meshRef.current;
    
    // Get the shader material
    const material = mesh.material as THREE.ShaderMaterial;
    
    // Update time and mouse uniforms
    material.uniforms.uTime.value = time;
    material.uniforms.uMouse.value.copy(mousePos);
    
    // Keep rotation constant
    mesh.rotation.y = time * 0.1;
    
    // Get access to geometry to manipulate vertices directly
    const geometry = mesh.geometry as THREE.BufferGeometry;
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
      const noiseValue = simplex3(
        x * 2.0 + time * 0.5,
        y * 3.0,
        z * 2.0 - time * 0.5
      ) * 0.2;
      
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
  function simplex3(x: number, y: number, z: number): number {
    // Very simplified noise function that mimics the shader's noise
    return (Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x)) * 0.16667;
      }
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 128, 128]} />
      <shaderMaterial
        vertexShader={`
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
        `}
        fragmentShader={`
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
        `}
        uniforms={{
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector3(0, 0, 0) },
        }}
        side={THREE.FrontSide}
      />
    </mesh>
  )
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

  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.4} />
      
      {/* Directional light to enhance 3D effect */}
      <directionalLight position={[2, 1, 1]} intensity={0.5} color="#ffffff" />
      
      {/* Colored point light to enhance the Siri-like glow */}
      <pointLight position={[0, 0, 3]} intensity={0.6} color="#2060ff" />
      
      <SiriJellyfish />
    </>
  )
}

// Chat message interface
interface Message {
  content: string;
  isUser: boolean;
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
  
  const [isChatMode, setIsChatMode] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [useSpeechOutput, setUseSpeechOutput] = useState(true)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messageEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to latest message
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Monitor changes to isSpeaking state
  useEffect(() => {
    console.log('isSpeaking state changed:', isSpeaking);
  }, [isSpeaking]);
  
  // Handle speech recognition
  const handleSpeechRecognition = async () => {
    setIsListening(true);
    
    try {
      // Call the speech recognition API
      const response = await fetch('http://localhost:9001/speech/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from speech service');
      }
      
      const data = await response.json();
      
      if (data.text) {
        setInputValue(data.text);
        // Automatically send the message if speech is detected
        const message = data.text;
        
        // Add some delay to allow user to see what was recognized
        setTimeout(() => {
          const newUserMessage: Message = {
            content: message,
            isUser: true
          };
          
          setMessages(prev => [...prev, newUserMessage]);
          setInputValue('');
          handleSendMessageWithText(message);
        }, 1000);
      } else {
        console.error('No speech recognized');
      }
    } catch (error) {
      console.error('Error with speech recognition:', error);
    } finally {
      setIsListening(false);
    }
  };
  
  // Function to stop speech playback
  const stopSpeech = async () => {
    try {
      // Call the server to stop speech
      await fetch('http://localhost:9001/speech/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Immediately set speaking to false to show microphone button
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error stopping speech:', error);
      // Make sure speaking state is reset even if there's an error
      setIsSpeaking(false);
    }
  };
  
  // Function to speak text using the speech synthesis API
  const speakResponse = async (text: string) => {
    if (!useSpeechOutput) return;
    
    try {
      // Set speaking state to true
      setIsSpeaking(true);
      
      // Call the speech synthesis API
      await fetch('http://localhost:9001/speech/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      // Simple fixed duration based on text length
      // This is a fallback in case the server doesn't provide completion notification
      const wordCount = text.split(/\s+/).length;
      const approximateDuration = Math.max(3000, wordCount * 300); // 300ms per word minimum 3 seconds
      
      console.log(`Setting speech timeout for ${approximateDuration}ms`);
      
      // Set timeout to reset the speaking state
      setTimeout(() => {
        console.log('Speech timeout completed, setting isSpeaking to false');
        setIsSpeaking(false);
      }, approximateDuration);
      
    } catch (error) {
      // If there's an error, make sure to reset the speaking state
      console.error('Error with speech synthesis:', error);
      setIsSpeaking(false);
    }
  };
  
  // Helper function to handle sending a message with specific text
  const handleSendMessageWithText = async (text: string) => {
    setIsLoading(true);
    
    try {
      // Call the triage agent API
      const response = await fetch('http://localhost:9001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from triage agent service');
      }
      
      const data = await response.json();
      
      const aiResponse: Message = {
        content: data.response || "Sorry, I couldn't process your request.",
        isUser: false
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Speak the response if speech output is enabled
      if (useSpeechOutput && data.response) {
        console.log("Speech output is enabled, speaking response");
        await speakResponse(data.response);
      } else {
        console.log("Speech output is disabled, not speaking response");
      }
    } catch (error) {
      console.error('Error calling triage agent API:', error);
      
      const errorMessage: Message = {
        content: "Sorry, I couldn't connect to the triage agent service. Please try again later.",
        isUser: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsSpeaking(false); // Ensure speaking state is reset on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send message to Triage Agent API
  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;
    
    const newUserMessage: Message = {
      content: inputValue,
      isUser: true
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    const messageText = inputValue;
    setInputValue('');
    
    // Use the helper function to handle the actual API call
    handleSendMessageWithText(messageText);
  };
  
  // Enter key handler
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  return (
    <div className="app">
      <header>
        <LogoButton />
        <nav>
          <ul>
            <li className="active"><Link to="/">CAMPUS.AI</Link></li>
            <li><Link to="/calendar">Calendar</Link></li>
            <li><Link to="/booking">Booking</Link></li>
            <li><Link to="/user">User</Link></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      </header>
      
      <main>
        <div className="shader-container">
          <Canvas 
            camera={{ position: [0, 0, 4], fov: 45 }}
            frameloop="always"
            onCreated={({ gl }) => {
              // Set clear color to match background
              gl.setClearColor(new THREE.Color('#080510'));
              
              // Force context preservation to avoid issues on some browsers
              (gl as any).preserveDrawingBuffer = true;
            }}
          >
            <Scene />
          </Canvas>
          
          {/* Welcome text that shows the "Ask me" button */}
          <div className={`overlay-text ${isChatMode ? 'fade-out' : ''}`}>
            <h1><span>Hi, I am </span>CAMPUS.AI</h1>
            <button 
              className="ask-me-button"
              onClick={() => setIsChatMode(true)}
            >
              Ask me anything
            </button>
          </div>
          
          {/* Chat interface */}
          <div className={`chat-interface ${isChatMode ? 'visible' : ''}`}>
            <div className="chat-header">
              <button 
                className="back-button"
                onClick={() => setIsChatMode(false)}
              >
                Back
              </button>
              <h2>Chat with CAMPUS.AI</h2>
              <div className="speech-controls">
                <div className="speech-toggle">
                  <span className="speech-toggle-label">{useSpeechOutput ? "Speech: On" : "Speech: Off"}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={useSpeechOutput}
                      onChange={() => setUseSpeechOutput(prev => !prev)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <p>I can help with various tasks including calendar management, IoT devices, speech recognition, and attendance tracking. Just ask!</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message ${msg.isUser ? 'user-message' : 'ai-message'}`}
                  >
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))
              )}
              {isLoading && !isSpeaking && (
                <div className="message ai-message">
                  <div className="message-content">Thinking...</div>
                </div>
              )}
              <div ref={messageEndRef} />
            </div>
            
            <div className="chat-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about anything on campus..."
                className="chat-input"
                autoFocus={isChatMode}
                disabled={isLoading || isListening}
              />
              {isSpeaking ? (
                <button 
                  className="mic-button stop-speaking"
                  onClick={stopSpeech}
                  title="Stop speaking"
                >
                  ✅
                </button>
              ) : (
                <button 
                  className={`mic-button ${isListening ? 'listening' : ''}`}
                  onClick={handleSpeechRecognition}
                  disabled={isLoading}
                  title={isListening ? "Listening..." : "Click to speak"}
                >
                  🎤
                </button>
              )}
              <button 
                className="send-button"
                onClick={handleSendMessage}
                disabled={inputValue.trim() === '' || isLoading}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <footer>
        <div className="social-links">
          <a href="https://github.com/login" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i className="icon-github"></i></a>
          <a href="https://www.linkedin.com/login" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="icon-linkedin"></i></a>
          <a href="https://outlook.live.com/owa/" target="_blank" rel="noopener noreferrer" aria-label="Email"><i className="icon-mail"></i></a>
          <a href="https://bb.imperial.ac.uk" target="_blank" rel="noopener noreferrer" aria-label="Blackboard"><i className="icon-bb"></i></a>
          <a href="https://edstem.org/us/dashboard" target="_blank" rel="noopener noreferrer" aria-label="Ed"><i className="icon-ed"></i></a>
        </div>
      </footer>
    </div>
  )
}

export default App
