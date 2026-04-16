import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { UserData } from '../types';
import Logo from './Logo';
import { useTypewriter } from '../hooks/useTypewriter';

const placeholders = {
  name: ['Jane Doe', 'John Smith', 'Alex River', 'Sarah Chen'],
  role: ['Senior Product Designer', 'Full Stack Developer', 'Creative Director', 'Growth Marketer'],
  location: ['San Francisco, CA', 'Brooklyn, NY', 'London, UK', 'Remote / Digital Nomad'],
  availability: ['Open to work', 'Freelancing', 'Contracting', 'Part-time consultant'],
  bio: [
    "I'm a designer passionate about creating intuitive user experiences...",
    "I build scalable web applications with React and Node.js...",
    "Bringing stories to life through digital art and motion design.",
    "Helping startups scale their engineering teams and products."
  ],
  hobbies: [
    'Photography, Specialty Coffee, Bouldering',
    'Video Games, Pizza, Retro Tech',
    'Surfing, Gardening, Open Source',
    'Road Cycling, Jazz, Mechanical Keyboards'
  ],
  experience: [
    'Senior Dev at Stripe, built the new checkout flow',
    'Lead Designer at Airbnb, redesigned the host dashboard',
    'Frontend Engineer at Vercel, worked on the Next.js runtime',
    'Product Lead at Slack, launched the new connect features'
  ],
  projects: [
    'Built a SaaS platform for creative portfolios using Next.js',
    'Designed a mobile app for sustainable grocery shopping',
    'Contributed to popular GSAP animation libraries',
    'Created a data visualization tool for climate change research'
  ],
  skills: [
    'React, UI/UX, Figma, User Research',
    'Node.js, TypeScript, PostgreSQL, AWS',
    'Branding, Typography, Illustration, Motion',
    'Solidity, Web3.js, Ethers, Hardhat'
  ],
  goals: [
    'Looking for full-time roles in fintech',
    'Open to freelance collaborations',
    'Exploring new opportunities in AI/ML startups',
    'Mentoring junior developers and building communities'
  ],
  socials: [
    'github.com/johndoe, linkedin.com/in/johndoe',
    'twitter.com/dev_alex, dribbble.com/alex_designs',
    'behance.net/sarah_c, read.cv/sarah_chen',
    'medium.com/@tech_lead, dev.to/top_dev'
  ]
};

interface FormFlowProps {
  onSubmit: (data: UserData) => void;
  isGenerating: boolean;
}

const steps = [
  {
    id: 'basics',
    title: 'Let\'s start with the basics',
    subtitle: 'Who are you and what do you do?',
  },
  {
    id: 'bio',
    title: 'Tell us your story',
    subtitle: 'A brief background, hobbies, and the vibe you want for your site.',
  },
  {
    id: 'experience',
    title: 'Your experience',
    subtitle: 'Where have you worked and what did you achieve?',
  },
  {
    id: 'projects',
    title: 'Key Projects',
    subtitle: 'What are you most proud of building or creating?',
  },
  {
    id: 'skills',
    title: 'Skills & Goals',
    subtitle: 'What are you great at, and what\'s next for you?',
  },
  {
    id: 'photos',
    title: 'Photos (Optional)',
    subtitle: 'Upload any photos you want to feature on your site.',
  },
  {
    id: 'socials',
    title: 'Where can people find you?',
    subtitle: 'Add your social links to connect with visitors.',
  }
];

export default function FormFlow({ onSubmit, isGenerating }: FormFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<UserData>({
    name: '',
    role: '',
    location: '',
    availability: '',
    bio: '',
    hobbies: '',
    experience: '',
    projects: '',
    skills: '',
    goals: '',
    socials: '',
    vibe: 'Editorial, modern, and premium',
    photos: [],
  });

  const namePlaceholder = useTypewriter(placeholders.name);
  const rolePlaceholder = useTypewriter(placeholders.role);
  const locationPlaceholder = useTypewriter(placeholders.location);
  const availabilityPlaceholder = useTypewriter(placeholders.availability);
  const bioPlaceholder = useTypewriter(placeholders.bio);
  const hobbiesPlaceholder = useTypewriter(placeholders.hobbies);
  const experiencePlaceholder = useTypewriter(placeholders.experience);
  const projectsPlaceholder = useTypewriter(placeholders.projects);
  const skillsPlaceholder = useTypewriter(placeholders.skills);
  const goalsPlaceholder = useTypewriter(placeholders.goals);
  const socialsPlaceholder = useTypewriter(placeholders.socials);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onSubmit(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photos: [...(prev.photos || []), reader.result as string]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative z-10 border border-gray-100">
        
        {/* Header with Logo */}
        <div className="px-10 pt-10 pb-4 sm:px-14 sm:pt-14 sm:pb-6 flex items-center space-x-3">
          <Logo className="w-8 h-8 text-black" />
          <span className="font-bold text-xl tracking-tight">BaseStack</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 w-full">
          <motion.div 
            className="h-full bg-black"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-10 sm:p-14">
          <div className="mb-10">
            <h2 className="text-3xl font-medium tracking-tight text-gray-900 mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-500">
              {steps[currentStep].subtitle}
            </p>
          </div>

          <div className="min-h-[320px] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {currentStep === 0 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder={namePlaceholder}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Professional Title</label>
                        <input
                          type="text"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          placeholder={rolePlaceholder}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder={locationPlaceholder}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                        <input
                          type="text"
                          name="availability"
                          value={formData.availability}
                          onChange={handleChange}
                          placeholder={availabilityPlaceholder}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Short Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder={bioPlaceholder}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Hobbies & Interests</label>
                      <input
                        type="text"
                        name="hobbies"
                        value={formData.hobbies}
                        onChange={handleChange}
                        placeholder={hobbiesPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website Vibe</label>
                      <select
                        name="vibe"
                        value={formData.vibe}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all bg-white"
                      >
                        <option value="Editorial, modern, and premium">Editorial & Premium</option>
                        <option value="Bold, creative, and art-directed">Bold & Art-Directed</option>
                        <option value="Warm, tactile, and human">Warm & Human</option>
                        <option value="Dark, minimal, and high-tech">Dark & High-Tech</option>
                        <option value="Playful, colorful, and creator-focused">Playful & Creator-Focused</option>
                        <option value="Quiet luxury, minimal, and sophisticated">Quiet Luxury</option>
                      </select>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                    <textarea
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder={experiencePlaceholder}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                      autoFocus
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Key Projects</label>
                    <textarea
                      name="projects"
                      value={formData.projects}
                      onChange={handleChange}
                      placeholder={projectsPlaceholder}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                      autoFocus
                    />
                  </div>
                )}

                {currentStep === 4 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Core Skills</label>
                      <input
                        type="text"
                        name="skills"
                        value={formData.skills}
                        onChange={handleChange}
                        placeholder={skillsPlaceholder}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Goals</label>
                      <textarea
                        name="goals"
                        value={formData.goals}
                        onChange={handleChange}
                        placeholder={goalsPlaceholder}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                      />
                    </div>
                  </>
                )}

                {currentStep === 5 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Upload Photos</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG or GIF (MAX. 5MB)</p>
                        </div>
                        <input type="file" className="hidden" multiple accept="image/*" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                    {formData.photos && formData.photos.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-4">
                        {formData.photos.map((photo, index) => (
                          <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200">
                            <img src={photo} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 6 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Social Links</label>
                    <textarea
                      name="socials"
                      value={formData.socials}
                      onChange={handleChange}
                      placeholder={socialsPlaceholder}
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                      autoFocus
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-10 flex items-center justify-between pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isGenerating}
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${currentStep === 0 ? 'text-transparent cursor-default' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            
            <button
              onClick={handleNext}
              disabled={isGenerating}
              className="flex items-center px-6 py-3 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-70"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Site
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-400 font-medium flex items-center justify-center">
          <Sparkles className="w-4 h-4 mr-2" />
          BaseStack AI Builder
        </p>
      </div>
    </div>
  );
}
