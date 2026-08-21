import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: "class",
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1, #6366F1)',
  				'2': 'var(--chart-2, #8B5CF6)',
  				'3': 'var(--chart-3, #F59E0B)',
  				'4': 'var(--chart-4, #10B981)',
  				'5': 'var(--chart-5, #F43F5E)'
  			}
  		},
  		borderRadius: {
			xs: 'var(--yp-radius-xs)',
			sm: 'var(--yp-radius-sm)',
			md: 'var(--yp-radius-md)',
			lg: 'var(--yp-radius-lg)',
			xl: 'var(--yp-radius-xl)',
			'2xl': 'var(--yp-radius-2xl)'
		}
  	}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
