// EmailTemplateDTO.ts

// 🔹 Details Section
export interface DetailSection {
  heading: string;
  fields: Field[];
}

export interface Field {
  name: string;
  value: string;
}

// 🔹 Table Section
export interface TableSection {
  heading: string;
  colWidth: string;
  data: string[][];
}

// 🔹 Button
export interface Button {
  href: string;
  buttonName: string;
}

export interface EmailTemplateData {
  subject?: string;
  body: {
    header: {
      heading: string;
      subHeading: string;
    };
    content: {
      salutation: string;
      paragraph1_blue: string;
      details: DetailSection[];
      paragraph2_blue: string;
      table: TableSection[];
      button1: Button;
      paragraph3_blue: string;
      paragraph4_orange: string;
      signature: string;
      disclaimer: string;
    };
    footer: {
      footer: string;
    };
  };
}
