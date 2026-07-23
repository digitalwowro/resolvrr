import {
  providerContainerEnd,
  providerContainerStart,
  type SignatureGoldenFixture,
} from "./ticket-article-signature-golden-support";

export const signatureFailOpenFixtures: SignatureGoldenFixture[] = [
  {
    name: "terminal business table containing ordinary message data",
    html: `
      <p>Here is the requested implementation status.</p>
      <table><tbody>
        <tr><th>Work item</th><th>Status</th></tr>
        <tr><td>Migration</td><td>Complete</td></tr>
        <tr><td>Validation</td><td>In progress</td></tr>
      </tbody></table>
    `,
    expected: {
      collapsed: false,
      visibleContains: ["implementation status", "Migration", "Validation"],
    },
  },
  {
    name: "linked image gallery without a terminal contact identity",
    html: `
      <p>Compare the product options below before choosing a model.</p>
      <table><tbody><tr>
        <td><a href="https://catalog.example.test/a"><img src="/inline/a" alt="Model A"></a></td>
        <td><a href="https://catalog.example.test/b"><img src="/inline/b" alt="Model B"></a></td>
        <td><a href="https://catalog.example.test/c"><img src="/inline/c" alt="Model C"></a></td>
      </tr></tbody></table>
    `,
    expected: {
      collapsed: false,
      visibleContains: ["product options", "Model A", "Model C"],
    },
  },
  {
    name: "overbroad provider container without a refinable signature",
    hint: "provider-container",
    html: `
      <p>Hello recipient,</p>
      ${providerContainerStart}<div>
        <p>The account values have been updated.</p>
        <p>Please review <a href="https://portal.example.test">the portal</a>
          and confirm the result.</p>
        <p><img src="/inline/business-evidence" alt="Updated account"></p>
      </div>${providerContainerEnd}
    `,
    expected: {
      collapsed: false,
      visibleContains: [
        "account values",
        "confirm the result",
        "/inline/business-evidence",
      ],
    },
  },
];
