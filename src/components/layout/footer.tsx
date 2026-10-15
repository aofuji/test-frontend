
import { Link } from '@tanstack/react-router'
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaLinkedinIn,
  FaYoutube,
} from 'react-icons/fa'

const benefits = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    description:
      'Proteja sua carteira, seus ativos e sua identidade.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    description:
      'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    description:
      'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const footerGroups = [
  {
    title: 'Meu perfil',
    items: [
      'Meu perfil',
      'Minha coleção',
      'Atividade',
      'Estúdio do criador',
      'Lista de interesse',
    ],
  },
  {
    title: 'Central de ajuda',
    items: [
      'Central de ajuda',
      'Como comprar NFTs',
      'Carteira e segurança',
      'Política do mercado',
      'Denunciar item',
    ],
  },
  {
    title: 'Coleções',
    items: [
      'Arte digital',
      'Fotografia',
      'Música',
      'Arte 3D',
      'Utilidade',
    ],
  },
]

const socialNetworks = [
  { label: 'Facebook', Icon: FaFacebookF },
  { label: 'Instagram', Icon: FaInstagram },
  { label: 'Twitter', Icon: FaTwitter },
  { label: 'LinkedIn', Icon: FaLinkedinIn },
  { label: 'YouTube', Icon: FaYoutube },
]

export function Footer() {
  return (
    <footer className="w-full bg-[#1b1513] font-mono text-xs text-[#f3ebe5]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Benefícios e newsletter */}
        <section
          aria-label="Benefícios da plataforma"
          className="grid grid-cols-1 gap-8 bg-[#2b1d19] px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-8"
        >
          {benefits.map(({ letter, title, description }) => (
            <div
              key={title}
              className="lg:border-r lg:border-[#8d5838] lg:px-4 lg:first:pl-0"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#d58a4c] text-lg font-bold text-[#1b1513]">
                {letter}
              </div>

              <h3 className="mb-2 text-[12px] font-bold leading-snug">
                {title}
              </h3>

              <p className="max-w-[190px] text-[11px] leading-[1.6] text-[#c49c79]">
                {description}
              </p>
            </div>
          ))}

          <div className="lg:pl-4">
            <h3 className="mb-3 max-w-[220px] text-[12px] font-bold leading-snug">
              Antecipe-se ao próximo lançamento
            </h3>

            <div className="flex h-9 overflow-hidden rounded-sm">
              <input
                type="email"
                aria-label="E-mail para newsletter"
                placeholder="Digite seu e-mail..."
                disabled
                className="min-w-0 flex-1 bg-[#412b20] px-3 text-[10px] text-[#f3ebe5] placeholder:text-[#b48a6b] outline-none disabled:cursor-not-allowed"
              />

              <button
                type="button"
                disabled
                title="Inscrição em breve"
                className="shrink-0 bg-[#d58a4c] px-3 text-[11px] font-bold text-[#1b1513] disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </div>

            <p className="mt-3 max-w-[230px] text-[11px] leading-[1.6] text-[#c49c79]">
              Receba lançamentos selecionados, histórias de criadores
              e novidades do mercado.
            </p>
          </div>
        </section>

        {/* Faixa institucional */}
        <div className="grid gap-4 bg-[#402817] px-6 py-5 text-[11px] sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:px-8">
          <span className="font-black tracking-[0.08em]">
            KURIO
          </span>

          <span className="max-w-[200px] leading-5">
            Feito para colecionadores, criadores e cultura digital.
          </span>

          <span>contato@email.com</span>

          <span>+55 11 4002 8922</span>
        </div>

        {/* Links e redes sociais */}
        <div className="grid gap-8 bg-[#2b1d19] px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 lg:px-8">
          {footerGroups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-4 text-[13px] font-bold">
                {group.title}
              </h3>

              <div className="flex flex-col items-start gap-3 text-[11px] text-[#c49c79]">
                {group.items.map((item) =>
                  item === 'Meu perfil' ? (
                    <Link
                      key={item}
                      to="/profile"
                      className="transition-colors hover:text-[#d58a4c]"
                    >
                      {item}
                    </Link>
                  ) : (
                    <span key={item}>{item}</span>
                  ),
                )}
              </div>
            </section>
          ))}

          <section>
            <h3 className="mb-4 text-[13px] font-bold">
              Redes sociais
            </h3>

            <div className="mb-7 flex flex-wrap gap-2">
              {socialNetworks.map(({ label, Icon }) => (
                <span
                  key={label}
                  role="img"
                  aria-label={label}
                  className="flex size-6 items-center justify-center rounded-[3px] border border-[#d58a4c] text-[#d58a4c]"
                >
                  <Icon className="size-3" aria-hidden="true" />
                </span>
              ))}
            </div>

            <h3 className="mb-3 text-[13px] font-bold">
              Carteiras compatíveis
            </h3>

            <Link
              to="/wallets"
              className="inline-flex max-w-full rounded-sm bg-[#402817] px-2 py-2 text-[9px] font-bold uppercase text-[#d58a4c] transition-colors hover:bg-[#51331e]"
            >
              MetaMask · WalletConnect · Coinbase
            </Link>
          </section>
        </div>

        {/* Copyright */}
        <div className="bg-[#1b1513] px-5 py-3 text-center text-[10px] text-[#c49c79]">
          © 2026 Kurio. Propriedade digital para todos.
        </div>
      </div>
    </footer>
  )
}
