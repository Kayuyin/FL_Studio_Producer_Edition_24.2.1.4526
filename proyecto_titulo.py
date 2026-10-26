from pathlib import Path
import json


BASE = Path(__file__).parent

DATA = {
		"site": {"title": "Mi proyecto", "description": "Sitio web responsive"},
		"sections": [
				{"title": "Sección 1", "text": "Contenido pendiente de completar."},
				{"title": "Sección 2", "text": "Aquí podrás agregar más información."},
				{"title": "Sección 3", "text": "Esta plantilla funciona en PC y celular."},
		],
}

HTML = '''<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="description" content="Sitio web responsive">
	<title>Mi proyecto</title>
	<link rel="stylesheet" href="styles.css">
</head>
<body>
	<header class="header">
		<a class="logo" href="#inicio">Mi proyecto</a>
		<button class="menu" aria-label="Abrir menú" aria-expanded="false">☰</button>
		<nav class="nav"><a href="#inicio">Inicio</a><a href="#contenido">Contenido</a><a href="#contacto">Contacto</a></nav>
	</header>
	<main>
		<section id="inicio" class="hero"><div class="container">
			<p class="eyebrow">BIENVENIDO</p><h1>Tu página web empieza aquí</h1>
			<p>Una base moderna y adaptable a computadoras, tablets y celulares.</p>
			<a class="button" href="#contenido">Ver contenido</a>
		</div></section>
		<section id="contenido" class="container section"><h2>Contenido</h2><div id="cards" class="cards"></div></section>
		<section id="contacto" class="contact section"><div class="container"><h2>Contacto</h2><p>Información pendiente de agregar.</p></div></section>
	</main>
	<footer>© <span id="year"></span> Mi proyecto</footer>
	<script src="app.js"></script>
</body></html>'''

CSS = ''':root{font-family:Arial,sans-serif;color:#172033;background:#f5f7fb}*{box-sizing:border-box}body{margin:0}.container{width:min(1100px,calc(100% - 32px));margin:auto}.header{display:flex;align-items:center;justify-content:space-between;padding:18px max(16px,calc((100% - 1100px)/2));background:#fff;position:sticky;top:0;z-index:2;box-shadow:0 2px 12px #17203314}.logo{color:#3157d5;font-weight:bold;text-decoration:none}.nav{display:flex;gap:24px}.nav a{color:#172033;text-decoration:none}.menu{display:none;border:0;background:none;font-size:1.5rem}.hero{padding:110px 0;background:linear-gradient(135deg,#e9efff,#fff)}.eyebrow{color:#3157d5;font-weight:bold;letter-spacing:.12em}h1{max-width:700px;font-size:clamp(2.2rem,7vw,4.5rem);line-height:1.05;margin:12px 0}.hero p{max-width:580px;font-size:1.15rem;line-height:1.6}.button{display:inline-block;padding:13px 22px;border-radius:8px;color:#fff;background:#3157d5;text-decoration:none;font-weight:bold}.section{padding:72px 0}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{padding:24px;background:#fff;border-radius:14px;box-shadow:0 5px 20px #17203312}.card h3{margin-top:0}.contact{background:#172033;color:#fff}footer{padding:24px;text-align:center;background:#101624;color:#cbd3e8}@media(max-width:700px){.menu{display:block}.nav{display:none;position:absolute;top:64px;left:0;right:0;flex-direction:column;padding:18px 16px;background:#fff}.nav.open{display:flex}.cards{grid-template-columns:1fr}.hero{padding:75px 0}}'''

JS = '''const menu=document.querySelector('.menu');
const nav=document.querySelector('.nav');
menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
fetch('data.json').then(r=>r.json()).then(data=>{document.title=data.site.title;document.querySelector('.logo').textContent=data.site.title;document.querySelector('#cards').innerHTML=data.sections.map(s=>`<article class="card"><h3>${s.title}</h3><p>${s.text}</p></article>`).join('')});
document.querySelector('#year').textContent=new Date().getFullYear();'''


def create_site():
		"""Genera los archivos editables del sitio web."""
		files = {"index.html": HTML, "styles.css": CSS, "app.js": JS,
						 "data.json": json.dumps(DATA, ensure_ascii=False, indent=2)}
		for name, content in files.items():
				(BASE / name).write_text(content, encoding="utf-8")
		print(f"Sitio creado en {BASE}")


if __name__ == "__main__":
		create_site()
