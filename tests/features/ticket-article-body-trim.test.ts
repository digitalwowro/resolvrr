import { describe, expect, it } from "vitest";
import { trimArticleBodyHtml } from "@/features/workspace/components/ticket-article-body-trim";

describe("trimArticleBodyHtml", () => {
  it("normalizes void tags for hydration-safe rendering", () => {
    const result = trimArticleBodyHtml("Hello,<br /><br />Thanks.");

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toBe("Hello,<br><br>Thanks.");
  });

  it("collapses signature blocks starting at signature markers", () => {
    const result = trimArticleBodyHtml(`
      <p>Hi Nicole,</p>
      <p>We are looking into this.</p>
      <p>Razvan Rosca</p>
      <p>--</p>
      <p>Super Support - Waterford Business Park<br>5201 Blue Lagoon Drive<br>Email: hot@example.com - Web: http://www.example.com/</p>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("signature");
    expect(result.visibleHtml).toContain("We are looking into this.");
    expect(result.visibleHtml).toContain("Razvan Rosca");
    expect(result.visibleHtml).not.toContain("Super Support");
    expect(result.hiddenHtml).toContain("Super Support");
  });

  it("removes empty visible paragraphs before collapsed signatures", () => {
    const result = trimArticleBodyHtml(`
      <p>This is a support request.</p>
      <p>Razvan Rosca</p>
      <p><br></p>
      <p>--</p>
      <p>Super Support - Waterford Business Park<br>5201 Blue Lagoon Drive<br>Email: hot@example.com - Web: http://www.example.com/</p>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("Razvan Rosca");
    expect(result.visibleHtml).not.toContain("<p><br></p>");
    expect(result.hiddenHtml).toContain("Super Support");
  });

  it("collapses contact clusters as signatures", () => {
    const result = trimArticleBodyHtml(`
      <p>Hello,</p>
      <p>Yes, this looks great.</p>
      <p>Razvan Rosca</p>
      <p>Tel: +40 731 059 660<br>Linkedin: https://www.linkedin.com/in/razvanrosca/<br>Facebook: https://fb.com/razvanrosca.com</p>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("signature");
    expect(result.visibleHtml).toContain("Yes, this looks great.");
    expect(result.hiddenHtml).toContain("Linkedin:");
  });

  it("collapses signatures before quoted replies as combined trimmed content", () => {
    const result = trimArticleBodyHtml(`
      <p>Hello,</p>
      <p>Yes, this looks great!</p>
      <p>Fusce tempor sollicitudin varius. Vestibulum sit amet scelerisque augue, eu posuere augue. Aenean eget odio eros.</p>
      <p>Razvan Rosca</p>
      <p>Tel: +40 731 059 660<br>Linkedin: https://www.linkedin.com/in/razvanrosca/<br>Facebook: https://fb.com/razvanrosca.com</p>
      <p><br></p>
      <p>On Tue, Jun 2, 2026 at 5:01 PM Za Mad via Users &lt;users@example.com&gt; wrote:</p>
      <blockquote>
        <p>Hello,</p>
        <p>Thanks, we are working on it!</p>
      </blockquote>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("Fusce tempor");
    expect(result.visibleHtml).toContain("Razvan Rosca");
    expect(result.visibleHtml).not.toContain("Tel:");
    expect(result.hiddenHtml).toContain("Linkedin:");
    expect(result.hiddenHtml).toContain("Za Mad via Users");
  });

  it("collapses nested div contact signatures before blockquoted replies", () => {
    const result = trimArticleBodyHtml(`
      <div>
        <div>
          Hello,<br><br>Yes, this looks great!<br><br>
          Fusce tempor sollicitudin varius. Vestibulum sit amet scelerisque augue, eu posuere augue.
          Pellentesque eu felis sed augue malesuada bibendum vel at magna.<br><br>
        </div>
        <div>
          <div>
            <div>Razvan Rosca</div>
            <div><br></div>
            <div>Tel: +40 731 059 660<br></div>
            <div>Linkedin: <a href="https://www.linkedin.com/in/razvanrosca/">https://www.linkedin.com/in/razvanrosca/</a></div>
            <div>Facebook: <a href="https://fb.com/razvanrosca.com">https://fb.com/razvanrosca.com</a></div>
          </div>
        </div>
        <br>
      </div>
      <br>
      <div>
        <div>On Tue, Jun 2, 2026 at 5:01 PM Za Mad via Users &lt;users@zammad.isp.fun&gt; wrote:<br></div>
        <blockquote>
          <div>
            <div>
              Hello,<br><br>Thanks, we're working on it!<br><br>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </div>
          </div>
        </blockquote>
      </div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("Razvan Rosca");
    expect(result.visibleHtml).not.toContain("Tel:");
    expect(result.visibleHtml).not.toContain("Linkedin:");
    expect(result.hiddenHtml).toContain("Tel:");
    expect(result.hiddenHtml).toContain("Za Mad via Users");
  });

  it("collapses the raw Zammad nested contact signature before a quoted reply", () => {
    const result = trimArticleBodyHtml(
      '<div><div>Hello,<br /><br />Yes, this looks great!<br /><br />Fusce tempor sollicitudin varius. Vestibulum sit amet scelerisque augue, eu posuere augue. Aenean eget odio eros. Pellentesque eu felis sed augue malesuada bibendum vel at magna. Vivamus imperdiet pellentesque massa eget pharetra. Ut ultrices porttitor tellus, eget interdum arcu consectetur id. Nulla a nisi vulputate, scelerisque est et, ultricies mi. Nunc at mauris eget sapien luctus pulvinar. Maecenas consectetur lectus vel est eleifend, eu vehicula orci blandit.<br /><br /></div><div><div><div>Razvan Rosca</div><div><br /></div><div>Tel: +40 731 059 660<br /></div><div>Linkedin: <a href="https://www.linkedin.com/in/razvanrosca/" rel="noreferrer noopener" target="_blank">https://www.linkedin.com/in/razvanrosca/</a></div><div>Facebook: <a href="https://fb.com/razvanrosca.com" rel="noreferrer noopener" target="_blank">https://fb.com/razvanrosca.com</a></div></div></div><br /></div><br /><div><div>On Tue, Jun 2, 2026 at 5:01 PM Za Mad via Users &lt;users@zammad.isp.fun&gt; wrote:<br /></div><blockquote><div><div>Hello,<br /><br />Thanks, we\'re working on it!<br /><br />Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque ullamcorper ipsum odio, eu pretium justo porta quis. Sed tempus sodales libero, eget bibendum dui dignissim in. Pellentesque sollicitudin feugiat sapien maximus varius. Integer eget elit dictum, pulvinar tortor a, egestas dolor. Nam pretium enim quis pharetra mattis. Sed pellentesque augue quis tellus bibendum sodales. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent maximus urna commodo tincidunt dapibus. Vestibulum cursus dui a malesuada laoreet. Suspendisse est mauris, efficitur vitae rutrum sed, rutrum vitae nisi. Nullam lorem arcu, ultrices cursus eleifend ac, auctor vitae mi. Praesent a tristique erat. Phasellus viverra, lacus in convallis iaculis, ex turpis bibendum dolor, vitae posuere mauris tellus in arcu. Etiam in ipsum neque. Pellentesque faucibus erat eget est vulputate vulputate sit amet et mi. Quisque eget faucibus massa.<br /><br /><div>Za Mad<br /><span class="js-signatureMarker"></span><br />--<br /> Super Support - Waterford Business Park<br /> 5201 Blue Lagoon Drive - 8th Floor &amp; 9th Floor - Miami, 33126 USA<br /> Email: <a href="mailto:hot@example.com" rel="noreferrer noopener" target="_blank">hot@example.com</a> - Web: <a href="http://www.example.com/" rel="noreferrer noopener" target="_blank">http://www.example.com/</a><br />--</div></div></div></blockquote></div>',
    );

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("Razvan Rosca");
    expect(result.visibleHtml).not.toContain("Tel:");
    expect(result.hiddenHtml).toContain("Tel:");
    expect(result.hiddenHtml).toContain("Za Mad via Users");
  });

  it("closes visible inline tags when trimming inside a wrapper", () => {
    const result = trimArticleBodyHtml(
      [
        "<span>Hello,<br><br>",
        "Thanks, we're working on it!<br><br>",
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.<br><br>",
        "Za Mad<br><br>",
        "Tel: +40 731 059 660<br>",
        "Linkedin: https://www.linkedin.com/in/razvanrosca/<br>",
        "Facebook: https://fb.com/razvanrosca.com<br><br>",
        "On Tue, Jun 2, 2026 at 5:01 PM Za Mad via Users &lt;users@example.com&gt; wrote:<br>",
        "Hello again.</span>",
      ].join(""),
    );

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("Za Mad");
    expect(result.visibleHtml).not.toContain("Tel:");
    expect(result.visibleHtml.endsWith("</span>")).toBe(true);
  });

  it("removes trailing breaks inside the final visible block", () => {
    const result = trimArticleBodyHtml(
      [
        "Hello,<br><br>",
        "Thanks, we're working on it!<br><br>",
        "<span>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</span><br><br>",
        "<div>  Za Mad<br><br></div>",
        "<span class=\"js-signatureMarker\"></span><br>--<br>",
        "Super Support - Waterford Business Park<br>",
        "5201 Blue Lagoon Drive<br>",
        "Email: hot@example.com - Web: http://www.example.com/<br>--",
      ].join(""),
    );

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("signature");
    expect(result.visibleHtml).toContain("Za Mad");
    expect(result.visibleHtml).not.toContain("Za Mad<br><br>");
    expect(result.hiddenHtml).toContain("Super Support");
  });

  it("collapses text quote headers", () => {
    const result = trimArticleBodyHtml(`
      <p>Thanks, we are working on it.</p>
      <p>On Tue, Jun 2, 2026 at 5:01 PM Za Mad via Users &lt;users@example.com&gt; wrote:</p>
      <blockquote>
        <p>Hello,</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum cursus dui a malesuada laoreet.</p>
      </blockquote>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("quoted-reply");
    expect(result.visibleHtml).toContain("Thanks, we are working on it.");
    expect(result.hiddenHtml).toContain("Za Mad via Users");
  });

  it("collapses structural quote wrappers", () => {
    const result = trimArticleBodyHtml(`
      <p>Latest answer goes here.</p>
      <div class="gmail_quote">
        <p>Earlier customer message with enough content to be useful only after expansion.</p>
        <p>Another quoted line that keeps the hidden block above the collapse threshold.</p>
      </div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("quoted-reply");
    expect(result.visibleHtml).toContain("Latest answer goes here.");
    expect(result.hiddenHtml).toContain("Earlier customer message");
  });

  it("does not collapse short messages with an early dash marker", () => {
    const result = trimArticleBodyHtml("<p>--</p><p>Short note.</p>");

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Short note.");
  });
});
