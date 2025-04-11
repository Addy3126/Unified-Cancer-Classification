import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Menu, Brain } from 'lucide-react';
import './LandingPage.css'

const LandingPage: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showContent, setShowContent] = useState(false); // New state to control transition

  // Add transition effect when model is loaded
  useEffect(() => {
    if (modelLoaded) {
      // Short delay before showing content for smooth transition
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [modelLoaded]);
  
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
  }, [modelLoaded, isDragging]);
  
  // Initialize Three.js scene - only once
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Clear any existing elements to prevent duplicates
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    
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
        color: 0xed2d2d2,
        roughness: 0.9,
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
    
    // Load the .obj file - only once
    const objLoader = new OBJLoader();
    objLoader.load(
      '/assets/Brain_v4.obj',
      (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        // Apply the material to all meshes in the loaded object
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = brainMaterial;
            child.geometry.center();
          }
        });

        // Scale the model appropriately
        object.scale.set(0.03, 0.03, 0.03);
        object.rotateY(5);
        
        // Position the model - MOVE IT LOWER to appear at bottom of page
        object.position.set(0, -3, -30); // Adjust Y to be lower
        
        // Adjust camera position to look at the bottom portion
        camera.position.set(0, 0, 15);
        camera.lookAt(0, -2, -30);
        
        // Add to scene
        scene.add(object);

        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // Store a reference to the brain model for animation
        brainRef.current = object;
        
        // Signal model is loaded
        console.log("Model loaded successfully, updating state...");
        setModelLoaded(true);
      },
      // Progress callback
      (xhr) => {
        const progress = (xhr.loaded / xhr.total) * 100;
        console.log(`${progress.toFixed(2)}% loaded`);
        setLoadingProgress(Math.round(progress));
      },
      // Error callback
      (error) => {
        console.error('An error happened while loading the model:', error);
      }
    );
    
    // Modified mouse event listeners that don't interfere with other components
    const onMouseDown = (event: MouseEvent) => {
      // Only handle events if they originated from the brain container
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
      // Only rotate if we started dragging from the brain container
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

    // Only add event listeners to the renderer's DOM element
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
      const delta = (now - lastFrameTime) / 1000; // delta in seconds
      lastFrameTime = now;

      // Rotate based on time, not frames
      if (brainRef.current && !isDragging && !isMouseDownRef.current) {
        const rotationSpeed = 0.01; // radians per second
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
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Clean up Three.js resources
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Properly dispose of Three.js objects
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
  }, []);
  
  // Loading screen component
  // if (!showContent) {
  //   return (
  //     <div className="loader-screen">
  //       <div className="loader-title">Unified Cancer Classification</div>
  //       <div className="loader-brain">
  //         <Brain size={64} color="#ed2d2d" />
  //       </div>
  //       <div className="loader-text">Loading 3D Model</div>
  //       <div className="loader-progress">
  //         <div
  //           className="loader-bar"
  //           style={{ width: `${loadingProgress}%` }}
  //         ></div>
  //       </div>
  //       <div className="loader-percentage">{loadingProgress}%</div>
  //     </div>
  //   );
  // }

  // Main content when model is loaded
  return (
    <div className="landing-container loaded">
      {/* Navbar */}
      <div className="navbar">
        <div className="navbar-logo">
          <Brain size={32}/> UCC
        </div>
        <button className="navbar-menu-button">
          <Menu size={42} strokeWidth={2}/>
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
        {/* <p className="title-subheading">
          Advanced CNN technology for precise brain tumor analysis
        </p> */}
      </div>
      
      {/* 3D Brain Container - Positioned at bottom with only top 60% visible */}
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