function Header() {
	return (
		<header className="w-full rounded-3xl px-6 py-10 mt-2 bg-[#8b4513] text-white">
			<nav aria-label="Main navigation" className="mx-auto max-w-6xl">
                
				<ul className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold uppercase tracking-wide text-white md:justify-start">
					<li>
						<a className="transition hover:text-gray-600" href="#home">
							Home
						</a>
					</li>
					<li>
						<a className="transition hover:text-gray-600" href="#about-us">
							About Us
						</a>
					</li>
					<li>
						<a className="transition hover:text-gray-600" href="#services">
							Services
						</a>
					</li>
					<li>
						<a className="transition hover:text-gray-600" href="#contacts">
							Contacts
						</a>
					</li>
				</ul>
			</nav>
		</header>
	)
}

export default Header
