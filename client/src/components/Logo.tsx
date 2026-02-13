import { Box, Text, Group } from '@mantine/core';

export const TagzillaLogo = ({ size = 80, showText = true }: { size?: number, showText?: boolean }) => {
  return (
    <Box style={{ textAlign: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dinosaur Silhouette - Clean & Strong */}
        <path
          d="M15 85 
             C 15 85, 10 75, 15 65 
             C 20 55, 35 50, 40 35 
             C 45 20, 55 15, 65 15 
             C 75 15, 85 20, 85 30 
             C 85 35, 80 40, 75 42 
             L 78 48 
             C 85 50, 90 60, 90 70 
             C 90 80, 80 85, 70 85 
             L 15 85 Z"
          fill="#40c057"
        />
        
        {/* Back Spikes - Integrated as a darker shade */}
        <path
          d="M42 28 L 35 18 L 48 24 Z
             M55 18 L 52 8 L 62 15 Z
             M70 18 L 72 8 L 78 20 Z"
          fill="#2f9e44"
        />

        {/* Shield - Representing Privacy, held by the Dino */}
        <path
          d="M60 55 
             C 60 55, 85 55, 85 75 
             C 85 90, 60 95, 60 95 
             C 60 95, 35 90, 35 75 
             C 35 55, 60 55, 60 55 Z"
          fill="#228be6"
          stroke="white"
          strokeWidth="3"
        />
        
        {/* Minimalist Eye */}
        <circle cx="72" cy="28" r="2" fill="white" />
      </svg>
      
      {showText && (
        <Group gap={0} justify="center" mt={5}>
          <Text fw={900} size="xl" c="green.8" style={{ letterSpacing: -0.5 }}>Tag</Text>
          <Text fw={900} size="xl" c="blue.7" style={{ letterSpacing: -0.5 }}>Zilla</Text>
        </Group>
      )}
    </Box>
  );
};
