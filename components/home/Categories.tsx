import Link from "next/link";
import { homeCategories } from "@/data/home";

export default function Categories() {
  return (
    <section className="sec grain" id="menu" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">The Menu</span>
            <h2 className="display" style={{ marginTop: 18 }}>Pick your <span className="amber">meal</span>.</h2>
          </div>
          <Link href="/menu" className="viewall">Full menu →</Link>
        </div>

        <div className="cats">
          {homeCategories.map((c) => {
            // plain <img>: some of these are remote Unsplash photos and one is scaled inside its ring
            // eslint-disable-next-line @next/next/no-img-element
            const img = <img src={c.img} alt={c.imgAlt} loading="lazy" style={c.imgPos ? { objectPosition: c.imgPos } : undefined} />;
            return (
              <Link className="cat" href={`/menu#panel-${c.id}`} data-cat data-tilt key={c.id}>
                <div className="cat-ring" data-spin>
                  {c.zoomed ? <div style={{ width: "100%", height: "100%", transform: "scale(1.45)" }}>{img}</div> : img}
                </div>
                <h3>{c.title}</h3>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
