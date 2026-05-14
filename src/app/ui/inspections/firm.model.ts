export class Firm {
  id: number;
  name: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  responsiblePerson: number;
  status: number;

  constructor(
    id: number,
    name: string,
    description: string,
    address: string,
    phone: string,
    email: string,
    website: string,
    logo: string,
    responsiblePerson: number,
    status: number
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.address = address;
    this.phone = phone;
    this.email = email;
    this.website = website;
    this.logo = logo;
    this.responsiblePerson = responsiblePerson;
    this.status = status;
  }
}
