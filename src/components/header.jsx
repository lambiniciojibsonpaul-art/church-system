import { useState } from 'react'

function Header() {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<header className="mt-2 w-[90%] items-center mx-auto justify-center rounded-3xl bg-[#6E5D57] px-6 py-5 text-white">
			<nav aria-label="Main navigation" className="mx-auto max-w-auto">
				<div className="flex items-center justify-between">
					<a href="#home" className="text-lg font-bold tracking-wide">
						Church Name
					</a>

					<button
						type="button"
						onClick={() => setIsOpen((prev) => !prev)}
						className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/40 md:hidden"
						aria-expanded={isOpen}
						aria-controls="mobile-menu"
						aria-label="Toggle navigation"
					>
						<span className="flex flex-col gap-1">
							<span className="block h-0.5 w-5 bg-white"></span>
							<span className="block h-0.5 w-5 bg-white"></span>
							<span className="block h-0.5 w-5 bg-white"></span>
						</span>
					</button>

					<ul className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-wide text-white md:flex">
						<li>
							<a className="transition hover:text-gray-200" href="#home">
								Home
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#about-us">
								About Us
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#services">
								Services
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#events">
								Events
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#contacts">
								Contacts
							</a>
						</li>
					</ul>
				</div>

				{isOpen && (
					<ul
						id="mobile-menu"
						className="mt-4 flex flex-col gap-4 border-t border-white/30 pt-4 text-left text-sm font-semibold uppercase tracking-wide md:hidden"
					>
						<li>
							<a className="transition hover:text-gray-200" href="#home" onClick={() => setIsOpen(false)}>
								Home
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#about-us" onClick={() => setIsOpen(false)}>
								About Us
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#services" onClick={() => setIsOpen(false)}>
								Services
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#events" onClick={() => setIsOpen(false)}>
								Events
							</a>
						</li>
						<li>
							<a className="transition hover:text-gray-200" href="#contacts" onClick={() => setIsOpen(false)}>
								Contacts
							</a>
						</li>
					</ul>
				)}
			</nav>
		</header>
	)
}

export default Header
