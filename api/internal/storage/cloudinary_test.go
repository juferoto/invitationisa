package storage

import "testing"

// La firma es el punto donde un error no se nota hasta que Cloudinary rechaza
// la subida en producción. Este es el ejemplo publicado en su documentación,
// con su resultado: si la forma de firmar se rompe, esto lo dice aquí.
func TestCloudinarySignature(t *testing.T) {
	c := &Cloudinary{apiSecret: "abcd"}
	got := c.sign(map[string]string{
		"timestamp": "1315060510",
		"public_id": "sample_image",
		"eager":     "w_400,h_300,c_pad|w_260,h_200,c_crop",
	})
	const quiere = "bfd09f95f331f558cbd1320e67aa8d488770583e"
	if got != quiere {
		t.Errorf("firma = %q, se esperaba %q", got, quiere)
	}
}

// Las claves las genera KeyFor y de ellas se deduce todo lo demás sin
// preguntarle nada a Cloudinary: el tipo, el identificador y la dirección
// pública. Si las tres dejaran de coincidir, los archivos se subirían a un
// sitio y se servirían desde otro.
func TestCloudinaryKeyMapping(t *testing.T) {
	cases := []struct {
		key  string
		kind string
		id   string
		url  string
	}{
		{
			key:  "image/hero/47c3a616.jpg",
			kind: "image",
			id:   "image/hero/47c3a616",
			url:  "https://res.cloudinary.com/demo/image/upload/image/hero/47c3a616.jpg",
		},
		{
			key:  "video/a0a8e5e2.mp4",
			kind: "video",
			id:   "video/a0a8e5e2",
			url:  "https://res.cloudinary.com/demo/video/upload/video/a0a8e5e2.mp4",
		},
		{
			// El audio se clasifica como "video": así lo organiza Cloudinary.
			key:  "audio/music/dd787d10.mp3",
			kind: "video",
			id:   "audio/music/dd787d10",
			url:  "https://res.cloudinary.com/demo/video/upload/audio/music/dd787d10.mp3",
		},
		{
			// Lo que no es imagen ni sonido conserva la extensión en el
			// identificador, porque Cloudinary no se la añade.
			key:  "otros/lista.csv",
			kind: "raw",
			id:   "otros/lista.csv",
			url:  "https://res.cloudinary.com/demo/raw/upload/otros/lista.csv",
		},
	}

	c := &Cloudinary{cloud: "demo"}
	for _, caso := range cases {
		t.Run(caso.key, func(t *testing.T) {
			if got := cloudinaryKind(caso.key); got != caso.kind {
				t.Errorf("tipo = %q, se esperaba %q", got, caso.kind)
			}
			if got := cloudinaryID(caso.key); got != caso.id {
				t.Errorf("identificador = %q, se esperaba %q", got, caso.id)
			}
			if got := c.URL(caso.key); got != caso.url {
				t.Errorf("URL = %q, se esperaba %q", got, caso.url)
			}
		})
	}
}
