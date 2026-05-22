import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 text-lg font-bold text-white">
            <svg viewBox="0 0 48 48" className="h-8 w-8 text-sky-400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30V24C10 22.3431 11.3431 21 13 21H35C36.6569 21 38 22.3431 38 24V30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 29L10.5 22.5C10.2 21.4 10 20.2 10 19C10 16.2386 12.2386 14 15 14H33C35.7614 14 38 16.2386 38 19C38 20.2 37.8 21.4 37.5 22.5L36 29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>DriveShare</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-slate-400">
            Rent or list cars from local owners. Secure payments, verified listings, real support.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-white">Company</h4>
          <nav className="flex flex-col gap-2 text-sm text-slate-400">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/help" className="hover:text-white">Help Center</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-white">Stay in touch</h4>
          <p className="text-sm text-slate-400">Subscribe to get latest offers and vehicle drops.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-2 flex items-center gap-2">
            <input type="email" placeholder="Your email" className="flex-1 rounded-full bg-slate-900/80 px-4 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/30" />
            <button className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white">Join</button>
          </form>
          <div className="mt-4 flex items-center gap-3">
            <a href="#" className="text-slate-400 hover:text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22 12a10 10 0 10-11.5 9.9v-7H8v-3h2.5V9.5c0-2.5 1.5-3.9 3.7-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12H20l-1.5 2.9v.1H22V12z"/></svg>
            </a>
            <a href="#" className="text-slate-400 hover:text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.15 4.15 0 001.82-2.28 8.3 8.3 0 01-2.63 1 4.13 4.13 0 00-7.04 3.76A11.72 11.72 0 013 4.89a4.13 4.13 0 001.28 5.51 4.07 4.07 0 01-1.87-.52v.05a4.13 4.13 0 003.31 4.05c-.46.13-.95.2-1.45.2-.35 0-.7-.03-1.04-.1a4.14 4.14 0 003.86 2.86A8.29 8.29 0 012 19.54a11.7 11.7 0 006.29 1.84c7.55 0 11.68-6.26 11.68-11.68v-.53A8.36 8.36 0 0022.46 6z"/></svg>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
          <span>© {new Date().getFullYear()} DriveShare. All rights reserved.</span>
          <span>Made with ❤️ · Built for rentals</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
