export function navigateTo(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.dispatchEvent(new Event('app:route-change'));
}

export function navigateToCustomerDetail(customerId: string): void {
  navigateTo(`/customer/${customerId}`);
}

export function navigateToCustomers(): void {
  navigateTo('/customers');
}
