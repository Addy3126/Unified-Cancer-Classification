import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Ellipsis, Brain } from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onLoadingProgress: (progress: number) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoadingProgress }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const [_isDragging, setIsDragging] = useState<boolean>(false);
  const isDisposed = useRef<boolean>(false);
  
  // Optimize by using refs for mouse position tracking
  const mouseState = useRef({
    isDown: false,
    previousPosition: { x: 0, y: 0 }
  });

  // Handle scroll events
  useEffect(() => {
    const handleScroll = (): void => {
      if (isDisposed.current) return;
      
      const position = window.scrollY;
      
      // Calculate opacity based on scroll position
      const maxScroll = window.innerHeight * 0.5; // 50% of the viewport height 
      const opacity = Math.max(0, 1 - position / maxScroll);
      
      // Apply fade effect to title
      if (titleRef.current) {
        titleRef.current.style.opacity = opacity.toString();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    isDisposed.current = false;
    
    // Clear any existing elements to prevent duplicates
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
    // Update progress immediately to 10% to indicate we're starting
    onLoadingProgress(10);
    
    // Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    
    // Use lower pixel ratio for better performance
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const renderer = new THREE.WebGLRenderer({ 
      antialias: pixelRatio < 2, // Only use antialiasing for lower pixel ratios
      preserveDrawingBuffer: true, 
      alpha: true,
      powerPreference: 'high-performance' // Prioritize performance
    });
    renderer.setPixelRatio(pixelRatio);
    rendererRef.current = renderer;
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    
    // Add lights - simplified lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    // Use a more optimized material with less overhead
    const brainMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xF0BB78,
        roughness: 0.7,
        metalness: 0.4,
        transparent: true,
        opacity: 1,
        flatShading: true // Use flat shading for better performance
    });

    // Update progress to indicate scene setup is complete
    onLoadingProgress(30);
    
    // Load the .obj file
    const objLoader = new OBJLoader();
    objLoader.load(
      '/assets/Brain_v4.obj',
      (object) => {
        // Optimize geometry before adding to scene
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Simplify geometry if it's very complex
            if (child.geometry.attributes.position.count > 50000) {
              // We can't actually simplify here, but in a real app you might want to
              // use a decimation library or pre-optimize your models
              console.log("Model is complex - consider pre-optimizing for better performance");
            }
            
            child.material = brainMaterial;
            child.geometry.center();
            
            // Compute vertex normals for better lighting
            child.geometry.computeVertexNormals();
          }
        });

        // Scale and position the model
        object.scale.set(0.03, 0.03, 0.03);
        object.rotateY(5);
        object.position.set(0, -3, -30);
        
        // Adjust camera position
        camera.position.set(0, 0, 15);
        camera.lookAt(0, -2, -30);
        
        scene.add(object);
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // Store a reference to the brain model for animation
        brainRef.current = object;
        
        // Indicate model loading is complete
        onLoadingProgress(80);
        
        // Final render before signaling completion
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // Signal completion after a short delay
        setTimeout(() => {
          if (!isDisposed.current) {
            onLoadingProgress(100);
          }
        }, 200);
      },
      // Progress callback
      (xhr) => {
        if (xhr.lengthComputable) {
          // Map loading progress from 20-90%
          const loadProgress = 20 + Math.round((xhr.loaded / xhr.total) * 70);
          onLoadingProgress(loadProgress);
        }
      },
      // Error callback
      (error) => {
        console.error('An error happened while loading the model:', error);
        
        // Even on error, complete the loading to allow the app to continue
        onLoadingProgress(100);
      }
    );
    
    // Mouse event handlers - optimized
    const onMouseDown = (event: MouseEvent) => {
      if (isDisposed.current) return;
      
      if (event.target === renderer.domElement) {
        mouseState.current.isDown = true;
        mouseState.current.previousPosition = {
          x: event.clientX,
          y: event.clientY
        };
        setIsDragging(true);
        isDraggingRef.current = true;
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isDisposed.current || !mouseState.current.isDown || !brainRef.current) return;
      
      const deltaMove = {
        x: event.clientX - mouseState.current.previousPosition.x,
        y: event.clientY - mouseState.current.previousPosition.y
      };

      const rotationSpeed = 0.005;
      brainRef.current.rotation.y += deltaMove.x * rotationSpeed;
      
      mouseState.current.previousPosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseUp = () => {
      if (isDisposed.current) return;
      
      mouseState.current.isDown = false;
      setIsDragging(false);
      isDraggingRef.current = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Animation loop with frame rate limiting
    let lastFrameTime = performance.now();
    let frameCount = 0;
    
    const animate = (): void => {
      if (isDisposed.current) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Limit to 30 FPS for better performance
      const now = performance.now();
      const elapsed = now - lastFrameTime;
      
      if (elapsed < 33.33) { // ~30 FPS
        return;
      }
      
      frameCount++;
      
      // Only render every other frame when the user is not interacting
      // This reduces CPU/GPU load significantly
      if (!isDraggingRef.current && frameCount % 2 !== 0) {
        return;
      }
      
      const delta = elapsed / 1000;
      lastFrameTime = now;

      // Rotate based on time only when not being dragged
      if (brainRef.current && !isDraggingRef.current) {
        const rotationSpeed = 0.03;
        brainRef.current.rotation.y += rotationSpeed * delta;
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    // Handle window resize - throttled
    let resizeTimeout: number | null = null;
    const handleResize = (): void => {
      if (isDisposed.current) return;
      
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
      
      resizeTimeout = window.setTimeout(() => {
        if (cameraRef.current && rendererRef.current && mountRef.current) {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
      }, 100); // Throttle to once per 100ms
    };
    
    window.addEventListener('resize', handleResize);
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      isDisposed.current = true;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.removeEventListener('mousedown', onMouseDown);
      }
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Clean up THREE.js resources
      if (brainRef.current) {
        if (sceneRef.current) {
          sceneRef.current.remove(brainRef.current);
        }
        
        brainRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      // Reset references
      brainRef.current = null;
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [onLoadingProgress]);

  return (
    <div className="landing-container">
      {/* Navbar */}
      <div className="navbar">
        <div className="navbar-logo">
          <Brain size={32}/> UCC
        </div>
        <button className="navbar-menu-button">
          <Ellipsis size={42} />
        </button>
      </div>
      
      {/* Main Title */}
      <div 
        ref={titleRef}
        className="main-title"
      >
        <h1 className="title-heading">
          Unified Cancer Classification
        </h1>
      </div>
      
      {/* 3D Brain Container */}
      <div 
        ref={mountRef} 
        className="brain-container"
      />
      
      {/* Scroll indicator */}
      <div className="scroll-indicator">
        <p className="scroll-text">Scroll to explore</p>
        <div className="scroll-icon">
          <div className="scroll-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(LandingPage);