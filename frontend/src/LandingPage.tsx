import React, { useEffect, useRef} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Menu } from 'lucide-react';
import './LandingPage.css'

const LandingPage: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const brainRef = useRef<THREE.Mesh | null>(null);
  
  // Handle scroll events
  useEffect(() => {
    const handleScroll = (): void => {
      const position = window.scrollY;
      
      // Calculate opacity based on scroll position
      const maxScroll = window.innerHeight * 0.5;
      const opacity = Math.max(0, 1 - position / maxScroll);
      
      // Apply fade effect to title
      if (titleRef.current) {
        titleRef.current.style.opacity = opacity.toString();
      }
      
      // Rotate brain model to show top side
      if (brainRef.current) {
        const rotationProgress = Math.min(1, position / maxScroll);
        brainRef.current.rotation.x = -Math.PI / 2 * rotationProgress;
        
        // Move brain to top as scrolling progresses
        const initialY = 0;
        const targetY = -window.innerHeight * 0.3;
        brainRef.current.position.y = initialY + (targetY - initialY) * rotationProgress;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    // Create a simplified brain model (placeholder)
    // In a real application, you would load a detailed brain model using THREE.GLTFLoader
    const brainGeometry = new THREE.SphereGeometry(3, 32, 32);
    const brainMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe0c4a8,
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    
    // Create brain mesh with complex wrinkles (simplified)
    const brain = new THREE.Mesh(brainGeometry, brainMaterial);
    
    // Add wrinkle effect using displacement map
    const displacementMap = new THREE.TextureLoader().load('/api/placeholder/256/256');
    brainMaterial.displacementMap = displacementMap;
    brainMaterial.displacementScale = 0.2;
    
    brain.position.y = 0;
    brain.position.z = 0;
    scene.add(brain);
    brainRef.current = brain;
    
    // Add subtle ambient animation
    const pulseAnimation = (): void => {
      const time = Date.now() * 0.001; // Convert to seconds
      brain.scale.x = 1 + Math.sin(time) * 0.03;
      brain.scale.y = 1 + Math.sin(time) * 0.03;
      brain.scale.z = 1 + Math.sin(time) * 0.03;
    };
    
    // Add OrbitControls for interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.5;
    
    // Limit rotation to reasonable amounts
    controls.minPolarAngle = Math.PI / 4;
    controls.maxPolarAngle = Math.PI / 1.5;
    
    // Position camera
    camera.position.z = 8;
    camera.position.y = 2;
    
    // Animation loop
    const animate = (): void => {
      requestAnimationFrame(animate);
      controls.update();
      pulseAnimation();
      renderer.render(scene, camera);
    };
    
    // Handle window resize
    const handleResize = (): void => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    animate();
    
    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="landing-container">
      {/* Navbar */}
      <div className="navbar">
        {/* Logo */}
        <div className="navbar-logo">
          NeuroCNN
        </div>
        
        {/* Menu Icon */}
        <button className="navbar-menu-button">
          <Menu size={24} />
        </button>
      </div>
      
      {/* Main Title */}
      <div 
        ref={titleRef}
        className="main-title"
      >
        <h1 className="title-heading">
          Neural Cancer Detection
        </h1>
        <p className="title-subheading">
          Advanced CNN technology for precise brain tumor analysis
        </p>
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
      
      {/* Content that appears after scrolling */}
      <div className="content-container">
        <div className="breakthrough-section">
          <div className="breakthrough-content">
            <h2 className="breakthrough-heading">Breakthrough Technology</h2>
            <p className="breakthrough-text">
              Our CNN-based neural network achieves 97% accuracy in detecting cancerous tissue,
              setting new standards in medical imaging analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;