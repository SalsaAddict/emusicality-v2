import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { BreakdownComponent } from './breakdown/breakdown.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'breakdown/:songId', component: BreakdownComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
