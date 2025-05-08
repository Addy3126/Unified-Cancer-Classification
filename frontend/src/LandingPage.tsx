import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Ellipsis, Brain } from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onLoadingProgress: (progress: number) => void;
  onModelReady: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoadingProgress }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef<number>(0);

  // Handle scroll events
  useEffect(() => {
    const handleScroll = (): void => {
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
  }, [isDragging]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Clear any existing elements to prevent duplicates
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
    // Simulate progress even if the real progress is stuck
    const simulateProgressAnimation = () => {
      if (progressRef.current >= 100) {
        return;
      }
      
      const increment = Math.max(0.5, (100 - progressRef.current) * 0.05);
      progressRef.current = Math.min(99, progressRef.current + increment);
      
      onLoadingProgress(progressRef.current);
      animationFrameRef.current = requestAnimationFrame(simulateProgressAnimation);
    };
    
    // Start the progress animation immediately
    animationFrameRef.current = requestAnimationFrame(simulateProgressAnimation);
    
    // Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);
    
    const brainMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xF0BB78,
        roughness: 0.7,
        metalness: 0.4,
        transparent: true,
        opacity: 1
    });

    // Setup for manual model rotation control
    let isMouseDown = false;
    let previousMousePosition = {
      x: 0,
      y: 0
    };
    
    // Load the .obj file
    const objLoader = new OBJLoader();
    objLoader.load(
      '/assets/Brain_v4.obj',
      (object) => {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = brainMaterial;
            child.geometry.center();
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
        
        // Cancel the simulated progress animation
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        requestAnimationFrame(() => {
          // Force a render
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          
          // Now signal completion
          progressRef.current = 100;
          onLoadingProgress(100);
        });
      },
      // Progress callback
      (xhr) => {
        if (xhr.lengthComputable) {
          const actualProgress = Math.round((xhr.loaded / xhr.total) * 100);
          progressRef.current = actualProgress;
          onLoadingProgress(actualProgress);
        }
      },
      // Error callback
      (error) => {
        console.error('An error happened while loading the model:', error);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Even on error, complete the loading to allow the app to continue
        progressRef.current = 100;
        onLoadingProgress(100);
      }
    );
    
    // Mouse event listeners
    const onMouseDown = (event: MouseEvent) => {
      if (event.target === renderer.domElement) {
        isMouseDown = true;
        previousMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
        setIsDragging(true);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isMouseDown && brainRef.current) {
        const deltaMove = {
          x: event.clientX - previousMousePosition.x,
          y: event.clientY - previousMousePosition.y
        };

        const rotationSpeed = 0.005;
        brainRef.current.rotation.y += deltaMove.x * rotationSpeed;
        
        previousMousePosition = {
          x: event.clientX,
          y: event.clientY
        };
      }
    };

    const onMouseUp = () => {
      isMouseDown = false;
      setIsDragging(false);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Animation loop
    let lastFrameTime = performance.now();
    const isMouseDownRef = { current: false };

    window.addEventListener("mousedown", () => {
      isMouseDownRef.current = true;
    });

    window.addEventListener("mouseup", () => {
      isMouseDownRef.current = false;
    });

    const animate = (): void => {
      requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      // Rotate based on time
      if (brainRef.current && !isDragging && !isMouseDownRef.current) {
        const rotationSpeed = 0.0025;
        brainRef.current.rotation.y += rotationSpeed * delta;
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    // Handle window resize
    const handleResize = (): void => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    animate();
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (brainRef.current) {
        scene.remove(brainRef.current);
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
      
      renderer.dispose();
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

export default LandingPage;