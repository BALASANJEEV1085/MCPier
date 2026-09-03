import { Logo } from '@/components/logo'

const columns = [
  {
    title: 'Product',
    links: ['Features', 'MCP Servers', 'Models', 'Pricing'],
  },
  {
    title: 'Developers',
    links: ['Documentation', 'API', 'GitHub', 'Community'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Contact'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms'],
  },
]

export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
              Connect your MCPs. Give AI a goal. Let it do the work.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-muted-foreground hover:text-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-[12px] text-muted-foreground sm:flex-row">
          <p>© 2026 MCPier. All rights reserved.</p>
          <p>Connect. Prompt. Execute.</p>
        </div>
      </div>
    </footer>
  )
}
