const articles = [
  {
    image: '/images/nfts/nft3.png',
    alt: 'Macaco de pelagem escura com blazer claro',
    date: '12 de setembro',
    readingMinutes: 6,
    title: 'Como funciona a propriedade de NFTs',
    description: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
  },
  {
    image: '/images/nfts/nft1.png',
    alt: 'Macaco marrom com óculos e jaqueta verde',
    date: '13 de setembro',
    readingMinutes: 2,
    title: '10 artistas digitais para acompanhar',
    description: 'Conheça criadores que moldam a cultura digital.',
  },
  {
    image: '/images/nfts/nft4.png',
    alt: 'Macaco com chapéu verde e moletom roxo',
    date: '15 de setembro',
    readingMinutes: 3,
    title: 'Raridade, atributos e procedência',
    description: 'Entenda raridade, procedência, direitos autorais e utilidade.',
  },
  {
    image: '/images/nfts/nft2.png',
    alt: 'Macaco dourado com fones verdes',
    date: '15 de setembro',
    readingMinutes: 2,
    title: 'Como proteger sua carteira',
    description: 'Proteja sua carteira, seus ativos e sua identidade.',
  },
]

export function MintingDiary() {
  return (
    <section aria-labelledby="diario-heading" className="space-y-10 font-mono">
      <div className="space-y-3 text-center">
        <h2 id="diario-heading" className="text-2xl font-bold leading-9 text-[#f5f1eb] sm:text-3xl">Diário da Cunhagem</h2>
        <p className="text-sm leading-6 text-[#b39463]">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <div className="grid max-w-[1144px] grid-cols-1 gap-6 sm:grid-cols-2 lg:ml-2 lg:grid-cols-4">
        {articles.map((article) => (
          <article key={article.title} className="flex min-w-0 flex-col overflow-hidden rounded-lg bg-[#281914]">
            <img src={article.image} alt={article.alt} loading="lazy" className="aspect-[268/195] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-xs leading-4 text-[#b39463]">{article.date} <span aria-hidden="true" className="px-2">|</span> Leitura de {article.readingMinutes} min</p>
              <h3 className="text-base font-bold leading-[22px] text-[#f5f1eb]">{article.title}</h3>
              <p className="text-xs leading-4 text-[#b39463]">{article.description}</p>
              <span className="mt-auto pt-1 text-xs font-bold leading-4 text-[#d28a4c]">Ler mais <span aria-hidden="true">→</span></span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
