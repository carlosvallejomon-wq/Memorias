import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
  description:
    "Qué datos guarda Memorias Vivas, para qué, cuánto tiempo y cómo pedir que se borren.",
};

// Escrita en castellano llano a propósito: la lee gente que va a subir fotos
// de sus hijos en una comunión, no un departamento jurídico.
export default function PrivacidadPage() {
  return (
    <>
      <h1>Privacidad</h1>
      <p className="lead">
        Memorias Vivas guarda fotos y vídeos de eventos. Las fotos de personas
        son datos personales, así que aquí está explicado, sin rodeos, qué se
        guarda y qué puedes pedir.
      </p>

      <h2>Quién responde de tus datos</h2>
      <p>
        El responsable del álbum es la persona que lo crea (el organizador del
        evento). Memorias Vivas le presta el servicio: guarda los archivos y
        hace funcionar la página, siguiendo sus instrucciones.
      </p>

      <h2>Qué se guarda</h2>
      <ul>
        <li>
          <strong>Las fotos y vídeos</strong> que suben los invitados, junto con
          la fecha del archivo.
        </li>
        <li>
          <strong>El nombre</strong> que cada invitado escriba, si quiere
          ponerlo. Es opcional: se puede subir de forma anónima.
        </li>
        <li>
          <strong>Los comentarios, reacciones y mensajes</strong> del muro.
        </li>
        <li>
          <strong>Un código anónimo</strong> guardado en el navegador del
          invitado. No lleva su nombre ni su teléfono: solo sirve para que la
          app sepa qué fotos son suyas y pueda borrarlas.
        </li>
        <li>
          <strong>La cuenta del organizador</strong> (correo y nombre), que
          gestiona nuestro proveedor de acceso.
        </li>
      </ul>
      <p>
        <strong>No</strong> se hace reconocimiento facial, <strong>no</strong>{" "}
        se venden datos a nadie y <strong>no</strong> se usan las fotos para
        publicidad ni para entrenar sistemas de inteligencia artificial.
      </p>

      <h2>Quién puede ver las fotos</h2>
      <p>
        Cualquiera que tenga el enlace o el código QR del álbum. No hay
        contraseña, igual que un álbum que pasa de mano en mano en una boda. Por
        eso conviene compartirlo solo con los invitados. Los álbumes no
        aparecen en Google.
      </p>

      <h2>Dónde se guarda</h2>
      <p>
        En servidores de nuestros proveedores de alojamiento y base de datos,
        dentro de la Unión Europea o con las garantías legales necesarias. Se
        usan estos servicios: alojamiento de la web y de los archivos, base de
        datos, y el sistema de acceso de la cuenta del organizador.
      </p>

      <h2>Cuánto tiempo</h2>
      <p>
        Mientras el álbum exista. Si el organizador lo borra, se borran también
        todas sus fotos, vídeos, comentarios y mensajes, y no se pueden
        recuperar.
      </p>

      <h2>Qué puedes pedir</h2>
      <ul>
        <li>
          <strong>Borrar lo tuyo tú mismo:</strong> desde el mismo móvil con el
          que lo subiste, cada foto, comentario o mensaje tuyo tiene un botón de
          borrar. Si cambias de móvil, puedes llevarte tu código personal desde
          la propia página del álbum.
        </li>
        <li>
          <strong>Pedirle al organizador</strong> que retire cualquier
          contenido en el que salgas. Él puede borrar cualquier cosa del álbum.
        </li>
        <li>
          <strong>Acceder, rectificar, oponerte o reclamar</strong> ante la
          Agencia Española de Protección de Datos si crees que tus datos no se
          están tratando bien.
        </li>
      </ul>

      <h2>Menores</h2>
      <p>
        En los álbumes de comuniones, bautizos o fiestas infantiles salen niños.
        Quien sube una foto de un menor debe tener el permiso de sus padres o
        tutores. Si eres madre, padre o tutor y quieres que se retire una foto,
        pídeselo al organizador del álbum: puede borrarla al momento.
      </p>

      <h2>Cambios</h2>
      <p>
        Si esta página cambia, la versión nueva se publica aquí mismo. Última
        actualización: julio de 2026.
      </p>
    </>
  );
}
