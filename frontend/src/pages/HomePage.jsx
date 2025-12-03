import React from "react";
// 🚨 Using useNavigate from React Router DOM to fix the "next/router" resolution error in a Vite project
import { useNavigate } from "react-router-dom"; 

import { BackgroundBeamsWithCollision } from "../components/ui/background-beams-with-collision";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
// Import the new card components
import { CardContainer, CardBody, CardItem } from "../components/ui/3dCard"; 
// Import the new ParallaxScroll component
import { ParallaxScroll } from "../components/ui/parallax-scroll"; 

// --- DUMMY IMAGES ARRAY (REPLACED WITH ACTUAL URLs) ---
const DUMMY_IMAGES = [
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
     "https://www.reiner-sct.com/wp-content/uploads/45-KI-Sicherheit-Erfolgreiche-Nutzung-von-KI_AdobeStock_946065111.jpeg",
];
// ---------------------------------

const HomePage = () => {
     // Initialize the navigation hook
     const navigate = useNavigate(); 

     const navigateToChatbot = () => {
          // Navigate to the "/chatbot" route
          navigate("/chatbot"); 
     };

     return (
          <>
               {/* 🌌 Hero Section 🌌 */}
               <div className="h-screen w-full bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
                    <BackgroundBeamsWithCollision className="absolute top-0 left-0 w-full h-full z-0" />
                    <div className="relative z-10 max-w-2xl mx-auto p-4 flex flex-col items-center justify-center">
                         <h1 className="text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold">
                              Welcome to My Site
                         </h1>
                       <TextGenerateEffect words="This is a cool website built with Aceternity UI." className="text-center text-sm md:text-lg text-white mt-4" />
               
               {/* **START: CHATBOT BUTTON with React Router DOM navigation** */}
               <button 
     onClick={navigateToChatbot} // Calls navigate("/chatbot")
     className="
       mt-8 
       px-8 
       py-3 
       bg-gradient-to-r 
       from-purple-600 
       to-cyan-500 
       text-white 
       font-extrabold 
       rounded-full 
       shadow-lg 
       shadow-purple-500/50 
       hover:from-purple-700 
       hover:to-cyan-600 
       hover:shadow-xl 
       hover:shadow-cyan-400/70 
       hover:translate-y-[-2px] 
       hover:scale-[1.02] 
       transition 
       duration-500 
       ease-in-out 
       focus:outline-none 
       focus:ring-4 
       focus:ring-purple-500 
       focus:ring-opacity-75
       text-lg
       flex items-center space-x-2
       cursor-pointer
     "
>
     <span>Go to Chatbot</span>
     {/* <span role="img" aria-label="robot">🤖</span> */}
</button>
               {/* **END: CHATBOT BUTTON** */}

                    </div>
               </div>
               
               {/* **AESTHETIC SEPARATOR 1** */}
               <div className="w-full h-[2px] bg-neutral-950 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-75 animate-pulse"></div>
               </div>
               {/* --- */}
               
               {/* **Service Cards Section** */}
               <div className="h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-8">
               
                    <h2 className="text-4xl font-bold text-white mb-12">Our Services</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 w-full max-w-7xl px-4">
                         
                         {/* Card 1 */}
                         <CardContainer className="inter-var flex justify-center w-full"> 
                              <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                                   <CardItem
                                        translateZ="50"
                                        className="text-xl font-bold text-white dark:text-white"
                                   >
                                        Service One
                                   </CardItem>
                                   <CardItem
                                        as="p"
                                        translateZ="60"
                                        className="text-white text-sm max-w-sm mt-2 dark:text-neutral-300"
                                   >
                                        Detailed description for service one.
                                   </CardItem>
                                   <CardItem translateZ="100" className="w-full mt-4">
                                        <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                             Click for More
                                        </div>
                                   </CardItem>
                                   <div className="flex justify-between items-center mt-20">
                                        <CardItem
                                             translateZ={20}
                                             as="button"
                                             className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                                        >
                                             Try now →
                                        </CardItem>
                                        <CardItem
                                             translateZ={20}
                                             as="button"
                                             className="px-4 py-2 rounded-xl bg-white dark:bg-white dark:text-black text-black text-xs font-bold"
                                        >
                                             Sign up
                                        </CardItem>
                                   </div>
                              </CardBody>
                         </CardContainer>

                         {/* Card 2 */}
                         <CardContainer className="inter-var flex justify-center w-full">
                              <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                                   <CardItem
                                        translateZ="50"
                                        className="text-xl font-bold text-white dark:text-white"
                                   >
                                        Service Two
                                   </CardItem>
                                   <CardItem
                                        as="p"
                                        translateZ="60"
                                        className="text-white text-sm max-w-sm mt-2 dark:text-neutral-300"
                                   >
                                        Detailed description for service two.
                                   </CardItem>
                                   <CardItem translateZ="100" className="w-full mt-4">
                                        <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                             Click for More
                                        </div>
                                   </CardItem>
                                   <div className="flex justify-between items-center mt-20">
                                        <CardItem
                                             translateZ={20}
                                             as="button"
                                             className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                                        >
                                             Try now →
                                        </CardItem>
                                        <CardItem
                                             translateZ={20}
                                             as="button"
                                             className="px-4 py-2 rounded-xl bg-white dark:bg-white dark:text-black text-black text-xs font-bold"
                                        >
                                             Sign up
                                        </CardItem>
                                   </div>
                              </CardBody>
                         </CardContainer>

                         {/* Card 3 */}
                         <CardContainer className="inter-var flex justify-center w-full">
                              <CardBody className="bg-gray-800 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:border-white/[0.2] border-black/[0.1] w-full md:max-w-md h-auto rounded-xl p-6 border ">
                                   <CardItem
                                        translateZ="50"
                                        className="text-xl font-bold text-white dark:text-white"
                                   >
                                        Service Three
                                   </CardItem>
                                   <CardItem
                                        as="p"
                                        translateZ="60"
                                        className="text-white text-sm max-w-sm mt-2 dark:text-neutral-300"
                                   >
                                        Detailed description for service three.
                                   </CardItem>
                                   <CardItem translateZ="100" className="w-full mt-4">
                                        <div className="w-full h-20 bg-gray-700 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                                             Click for More
                                        </div>
                                   </CardItem>
                                   <div className="flex justify-between items-center mt-20">
                                        <CardItem
                                             translateZ={20}
                                             as="button"
                                             className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                                        >
                                             Try now →
                                        </CardItem>
                                        <CardItem
                                             translateZ={20}
                                             as="button"
                                             className="px-4 py-2 rounded-xl bg-white dark:bg-white dark:text-black text-black text-xs font-bold"
                                        >
                                             Sign up
                                        </CardItem>
                                   </div>
                              </CardBody>
                         </CardContainer>
                    </div>
               </div>
               
               {/* **AESTHETIC SEPARATOR 2** */}
               <div className="w-full h-[2px] bg-neutral-950 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-75 animate-pulse"></div>
               </div>
               {/* --- */}
               
               {/* 🖼️ NEW PARALLAX SCROLL SECTION 🖼️ */}
               <div className="w-full bg-neutral-950 flex flex-col items-center justify-center py-20">
                    <h2 className="text-4xl font-bold text-white mb-12">Our Latest Work</h2>
                    <ParallaxScroll images={DUMMY_IMAGES} className="w-full" />
               </div>

               {/* 🦶 START: EXPANDED FOOTER SECTION 🦶 */}
               <footer className="w-full bg-neutral-900 border-t border-neutral-800 pt-16 pb-8 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                         
                         {/* Grid for Columns */}
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 border-b border-neutral-700 pb-10">
                              
                              {/* Column 1: Logo/Title and Description */}
                              <div className="col-span-2 lg:col-span-2">
                                   <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4">
                                        My Site
                                   </h3>
                                   <p className="text-sm text-neutral-400 max-w-xs">
                                        Building the future one component at a time. We use the best UI tools to create stunning web experiences.
                                   </p>
                              </div>

                              {/* Column 2: Quick Links */}
                              <div>
                                   <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
                                   <ul className="space-y-3">
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">Home</a></li>
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">Services</a></li>
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">Pricing</a></li>
                                        <li><a onClick={navigateToChatbot} className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm cursor-pointer">Chatbot (AI)</a></li>
                                   </ul>
                              </div>

                              {/* Column 3: Legal & Support */}
                              <div>
                                   <h4 className="text-lg font-semibold mb-4 text-white">Support</h4>
                                   <ul className="space-y-3">
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">Contact Us</a></li>
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">FAQ</a></li>
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">Privacy Policy</a></li>
                                        <li><a href="#" className="text-neutral-400 hover:text-cyan-400 transition-colors duration-200 text-sm">Terms of Service</a></li>
                                   </ul>
                              </div>

                              {/* Column 4: Contact Info (Optional in small screens) */}
                              <div className="col-span-2 md:col-span-1">
                                   <h4 className="text-lg font-semibold mb-4 text-white">Get in Touch</h4>
                                   <p className="text-neutral-400 text-sm">123 Dark Mode Alley,</p>
                                   <p className="text-neutral-400 text-sm">Vite City, React Land</p>
                                   <p className="mt-4 text-neutral-400 text-sm">Email: <a href="mailto:info@mysite.com" className="hover:text-cyan-400">info@mysite.com</a></p>
                              </div>
                         </div>

                         {/* Copyright Section */}
                         <div className="mt-8 pt-4 flex flex-col md:flex-row justify-between items-center">
                              <p className="text-neutral-500 text-sm">
                                   &copy; {new Date().getFullYear()} My Site. All rights reserved. Built with React & Aceternity UI.
                              </p>
                              {/* Optional: Social Icons */}
                              <div className="flex space-x-4 mt-4 md:mt-0">
                                   <a href="#" className="text-neutral-500 hover:text-cyan-400 transition-colors duration-200">
                                        {/* Replace with actual SVG icons for social media */}
                                        <span className="sr-only">Twitter</span>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.84.37-1.74.62-2.67.75.96-.58 1.7-1.5 2.04-2.63-.9.53-1.89.92-2.93 1.12-2.12-2.27-5.92-.1-5.92 3.1 0 .24 0 .47.07.69C8.02 9.09 4.3 7.02 1.8 3.86.3 6.32 1.04 8.28 2.76 9.39c-.77 0-1.49-.23-2.13-.59v.03c0 2.37 1.69 4.34 3.93 4.79-.41.11-.84.17-1.28.17-.31 0-.6-.03-.89-.08.62 1.95 2.42 3.36 4.56 3.4.15 0 .3 0 .44-.01-1.68 1.32-3.8 2.09-6.07 2.09-.39 0-.77 0-1.15-.05 2.17 1.4 4.75 2.22 7.55 2.22 9.05 0 14.01-7.5 14.01-14.01 0-.21 0-.41-.01-.61.96-.69 1.79-1.54 2.45-2.51z"></path></svg>
                                   </a>
                                   <a href="#" className="text-neutral-500 hover:text-cyan-400 transition-colors duration-200">
                                        <span className="sr-only">LinkedIn</span>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zM8 19h-3v-11h3v11zM6.5 6.7c-.96 0-1.7-.75-1.7-1.7s.75-1.7 1.7-1.7 1.7.75 1.7 1.7-.75 1.7-1.7 1.7zM20 19h-3v-5.69c0-1.7-.6-2.85-2.2-2.85-1.2 0-1.9.8-2.2 1.5-.1.2-.1.5-.1.8v6.24h-3s.04-10.97 0-11h3v1.39c.57-.86 1.46-1.92 3.4-1.92 2.45 0 4.3 1.6 4.3 5v6.52z"></path></svg>
                                   </a>
                              </div>
                         </div>
                    </div>
               </footer>
               {/* 🦶 END: EXPANDED FOOTER SECTION 🦶 */}
          </>
     );
};

export default HomePage;