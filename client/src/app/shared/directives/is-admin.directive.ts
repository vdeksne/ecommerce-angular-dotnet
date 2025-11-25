import { Directive, effect, inject, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AccountService } from '../../core/services/account.service';

@Directive({
  selector: '[appIsAdmin]', // *appIsAdmin
  standalone: true
})
export class IsAdminDirective implements OnInit {
  private accountService = inject(AccountService);
  private viewContainerRef = inject(ViewContainerRef);
  private templateRef = inject(TemplateRef);

  ngOnInit() {
    // Use effect to reactively show/hide based on admin status
    // This will automatically re-evaluate when currentUser changes
    effect(() => {
      // Trigger the computed signal by accessing it
      const isAdmin = this.accountService.isAdmin();
      const user = this.accountService.currentUser();
      
      console.log('IsAdminDirective check:', { 
        isAdmin, 
        user: user ? { email: user.email, roles: user.roles } : null 
      });
      
      if (isAdmin) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainerRef.clear();
      }
    });
  }
}
