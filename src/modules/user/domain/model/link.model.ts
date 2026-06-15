import { randomUUID } from "crypto";
import { BaseDomain } from "../../../../shared/models/base-domain";

export enum LinkType {
  FACEBOOK = "facebook",
  WHATSAPP = "whatsapp",
  TWITTER = "twitter",
  LINKEDIN = "linkedin",
  INSTAGRAM = "instagram",
}

export class Link extends BaseDomain<string> {
  // 🔒 TRUE private fields
  #linkName: string;
  #linkType: LinkType;
  #linkValue: string;

  constructor(
    protected _id: string,
    linkName: string,
    linkType: LinkType,
    linkValue: string,
  ) {
    super(_id);

    this.#linkName = linkName;
    this.#linkType = linkType;
    this.#linkValue = linkValue;
  }

  static create(linkName: string, linkType: LinkType, linkValue: string) {
    return new Link(randomUUID(), linkName, linkType, linkValue);
  }

  update(link: Link) {
    this.#linkName = link.linkName;
    this.#linkType = link.linkType;
    this.#linkValue = link.linkValue;
    this.touch();
  }

  // === Getters (used by BaseDomain.toJson()) ===

  get linkName(): string {
    return this.#linkName;
  }

  get linkType(): LinkType {
    return this.#linkType;
  }

  get linkValue(): string {
    return this.#linkValue;
  }
}
