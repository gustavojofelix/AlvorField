import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { NotificationSimulatorComponent } from './components/notification-simulator/notification-simulator.component';

/**
 * Componente raiz da aplicação AlvorField.
 * Inclui o cabeçalho global e o outlet do router.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, NotificationSimulatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {
  title = 'AlvorField';
}
