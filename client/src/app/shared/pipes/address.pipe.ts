import { Pipe, PipeTransform } from '@angular/core';
import { ConfirmationToken } from '@stripe/stripe-js';
import { ShippingAddress } from '../models/order';

@Pipe({
  name: 'address',
  standalone: true,
})
export class AddressPipe implements PipeTransform {
  transform(
    value?: ConfirmationToken['shipping'] | ShippingAddress,
    ...args: unknown[]
  ): unknown {
    if (!value) {
      return 'Unknown address';
    }

    // Handle Stripe confirmation token shipping format
    if ('address' in value && value.address) {
      const { line1, line2, city, state, country, postal_code } = value.address;
      const name = value.name || 'Unknown';
      if (line1 && city && state && country && postal_code) {
        return `${name}, ${line1}${
          line2 ? ', ' + line2 : ''
        }, ${city}, ${state}, ${postal_code}, ${country}`;
      }
    }

    // Handle ShippingAddress format
    if ('line1' in value && value.line1) {
      const { line1, line2, city, state, country, postalCode, name } =
        value as ShippingAddress;
      const displayName = name || 'Unknown';

      // Build address string with available fields
      const parts: string[] = [];
      if (displayName) parts.push(displayName);
      if (line1) parts.push(line1);
      if (line2) parts.push(line2);
      if (city) parts.push(city);
      if (state) parts.push(state);
      if (postalCode) parts.push(postalCode);
      if (country) parts.push(country);

      if (parts.length > 1) {
        return parts.join(', ');
      } else if (line1) {
        return line1; // At least show the street address
      }
    }

    return 'Unknown address';
  }
}
